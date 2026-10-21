from django.core.management.base import BaseCommand
from accounts.models import AEMUser
from accounts.views import ensure_user_settings


class Command(BaseCommand):
    help = 'Promote an existing account or create a new permanent admin account.'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='The email of the account to make admin')
        parser.add_argument('--password', type=str, default=None, help='Set or reset the account password')
        parser.add_argument('--name', type=str, default=None, help='Full name for the account if creating new')

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        password = options.get('password')
        name = options.get('name')

        if not email:
            self.stderr.write(self.style.ERROR('Email must not be empty.'))
            return

        user = AEMUser.objects.filter(email__iexact=email).first()

        if user is None:
            default_name = name or email.split('@')[0].capitalize()
            user = AEMUser(
                email=email,
                full_name=default_name,
                role=AEMUser.Roles.ADMIN,
                is_active=True,
            )
            if password:
                user.set_password(password)
            else:
                user.set_unusable_password()
            user.save()
            ensure_user_settings(user)
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created new permanent admin account: {user.email} (ID: {user.id})'
                )
            )
        else:
            user.role = AEMUser.Roles.ADMIN
            user.is_active = True
            if name:
                user.full_name = name
            if password:
                user.set_password(password)
            user.save()
            ensure_user_settings(user)
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully promoted account to permanent admin: {user.email} (ID: {user.id})'
                )
            )

        if password:
            self.stdout.write(self.style.SUCCESS('Password has been updated.'))
        else:
            self.stdout.write(
                self.style.WARNING(
                    'No password was specified. The user can sign in via Google OAuth or you can provide --password.'
                )
            )
