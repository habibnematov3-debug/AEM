from datetime import time, timedelta

from django.db import connection
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from .auth_tokens import issue_auth_token
from .models import AEMUser, Event, EventLike, Participation
from .participation_ops import calculate_no_show_count


class AttendanceMetricsTests(TestCase):
    def test_calculate_no_show_count(self):
        self.assertEqual(calculate_no_show_count(5, 3), 2)
        self.assertEqual(calculate_no_show_count(2, 2), 0)
        self.assertEqual(calculate_no_show_count(1, 4), 0)


class UnmanagedModelTablesMixin:
    required_models = (AEMUser, Event, Participation, EventLike)

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        existing_tables = set(connection.introspection.table_names())
        cls._created_models = []

        with connection.schema_editor() as schema_editor:
            for model in cls.required_models:
                if model._meta.db_table in existing_tables:
                    continue
                schema_editor.create_model(model)
                cls._created_models.append(model)
                existing_tables.add(model._meta.db_table)

    @classmethod
    def tearDownClass(cls):
        try:
            with connection.schema_editor() as schema_editor:
                for model in reversed(getattr(cls, '_created_models', [])):
                    schema_editor.delete_model(model)
        finally:
            super().tearDownClass()


class RecommendedEventsAPIViewTests(UnmanagedModelTablesMixin, TestCase):
    def setUp(self):
        self.client = Client()
        self._sequence = 0
        self.now = timezone.now()
        self.today = timezone.localdate()
        self.current_user = self.create_user('student@example.com', 'Student')
        self.creator = self.create_user('organizer@example.com', 'Organizer')

    def create_user(self, email, name):
        return AEMUser.objects.create(
            full_name=name,
            email=email,
            password_hash='not-used',
            role=AEMUser.Roles.STUDENT,
            is_active=True,
            last_seen_at=self.now,
            created_at=self.now,
            updated_at=self.now,
        )

    def create_event(
        self,
        *,
        title,
        category,
        days_ahead=1,
        moderation_status=Event.ModerationStatuses.APPROVED,
        creator=None,
    ):
        self._sequence += 1
        return Event.objects.create(
            creator=creator or self.creator,
            title=title,
            description=f'{title} description',
            category=category,
            location='Campus Hall',
            image_url='',
            event_date=self.today + timedelta(days=days_ahead),
            start_time=time(10, 0),
            end_time=time(12, 0),
            moderation_status=moderation_status,
            capacity=50,
            created_at=self.now + timedelta(minutes=self._sequence),
            updated_at=self.now + timedelta(minutes=self._sequence),
        )

    def create_participation(self, *, user, event, status=Participation.Statuses.JOINED):
        return Participation.objects.create(
            user=user,
            event=event,
            status=status,
            joined_at=self.now,
            checked_in_at=None,
            reminder_sent_at=None,
        )

    def add_join_count(self, event, count):
        for index in range(count):
            attendee = self.create_user(
                f'attendee-{event.id}-{index}@example.com',
                f'Attendee {event.id}-{index}',
            )
            self.create_participation(user=attendee, event=event)

    def auth_headers(self):
        return {
            'HTTP_AUTHORIZATION': f'Bearer {issue_auth_token(self.current_user)}',
        }

    def test_recommended_events_requires_authentication(self):
        response = self.client.get(reverse('events-recommended'))

        self.assertEqual(response.status_code, 401)

    def test_recommended_events_prioritize_joined_categories_then_liked_categories(self):
        liked_history = self.create_event(
            title='Liked Art History',
            category='art',
            days_ahead=-2,
        )
        joined_history = self.create_event(
            title='Joined Tech History',
            category='tech',
            days_ahead=-2,
        )
        EventLike.objects.create(user=self.current_user, event=liked_history, created_at=self.now)
        self.create_participation(user=self.current_user, event=joined_history)

        tech_pick = self.create_event(title='Tech Candidate', category='tech')
        art_pick = self.create_event(title='Art Candidate', category='art')
        general_pick = self.create_event(title='General Candidate', category='general')
        waitlisted_pick = self.create_event(title='Waitlisted Candidate', category='tech')
        past_pick = self.create_event(title='Past Candidate', category='tech', days_ahead=-1)

        self.add_join_count(art_pick, 4)
        self.add_join_count(general_pick, 8)
        self.create_participation(
            user=self.current_user,
            event=waitlisted_pick,
            status=Participation.Statuses.WAITLISTED,
        )

        response = self.client.get(reverse('events-recommended'), **self.auth_headers())

        self.assertEqual(response.status_code, 200)
        result_ids = [item['id'] for item in response.json()['results']]

        self.assertEqual(
            result_ids[:3],
            [tech_pick.id, art_pick.id, general_pick.id],
        )
        self.assertNotIn(waitlisted_pick.id, result_ids)
        self.assertNotIn(past_pick.id, result_ids)
        self.assertNotIn(joined_history.id, result_ids)

    def test_recommended_events_fall_back_to_popularity_with_category_diversity(self):
        music_events = [
            self.create_event(title=f'Music {index}', category='music')
            for index in range(1, 5)
        ]
        tech_events = [
            self.create_event(title=f'Tech {index}', category='tech')
            for index in range(1, 3)
        ]
        art_event = self.create_event(title='Art 1', category='art')

        for event, joined_count in zip(music_events, [9, 8, 7, 6], strict=True):
            self.add_join_count(event, joined_count)
        for event, joined_count in zip(tech_events, [5, 4], strict=True):
            self.add_join_count(event, joined_count)
        self.add_join_count(art_event, 3)

        response = self.client.get(reverse('events-recommended'), **self.auth_headers())

        self.assertEqual(response.status_code, 200)
        results = response.json()['results']
        result_ids = [item['id'] for item in results]
        music_count = sum(1 for item in results if item['category'] == 'music')

        self.assertEqual(
            result_ids,
            [
                music_events[0].id,
                music_events[1].id,
                music_events[2].id,
                tech_events[0].id,
                tech_events[1].id,
                art_event.id,
            ],
        )
        self.assertEqual(music_count, 3)
