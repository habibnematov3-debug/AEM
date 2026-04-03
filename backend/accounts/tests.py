from django.test import TestCase

from .participation_ops import calculate_no_show_count


class AttendanceMetricsTests(TestCase):
    def test_calculate_no_show_count(self):
        self.assertEqual(calculate_no_show_count(5, 3), 2)
        self.assertEqual(calculate_no_show_count(2, 2), 0)
        self.assertEqual(calculate_no_show_count(1, 4), 0)
