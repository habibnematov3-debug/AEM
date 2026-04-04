from django.core.management.base import BaseCommand

from accounts.notifications import dispatch_due_event_reminders


class Command(BaseCommand):
    help = 'Send in-app and email reminders for joined participants whose events start soon.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours-ahead',
            type=int,
            default=24,
            help='Send reminders for joined events starting within this many hours.',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Send reminders even if reminder_sent_at is already set.',
        )

    def handle(self, *args, **options):
        hours_ahead = max(1, min(168, int(options['hours_ahead'])))
        sent_count = dispatch_due_event_reminders(
            hours_ahead=hours_ahead,
            force=bool(options['force']),
        )
        self.stdout.write(self.style.SUCCESS(f'Event reminders sent: {sent_count}'))
