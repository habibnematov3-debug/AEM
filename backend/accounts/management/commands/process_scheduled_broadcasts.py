from django.core.management.base import BaseCommand

from accounts.broadcast_ops import process_due_scheduled_broadcasts


class Command(BaseCommand):
    help = 'Deliver admin broadcast messages that were scheduled for send time.'

    def handle(self, *args, **options):
        processed = process_due_scheduled_broadcasts()
        self.stdout.write(self.style.SUCCESS(f'Scheduled broadcasts processed: {processed}'))
