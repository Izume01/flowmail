import unittest
import json
from handler import handler

class TestHandler(unittest.TestCase):
    def test_invalid_recipient_history(self):
        event = {
            'recipient_history': "not a list",
            'current_day_of_week': 3
        }
        response = handler(event, None)
        self.assertEqual(response['statusCode'], 400)
        body = json.loads(response['body'])
        self.assertIn('error', body)
        self.assertEqual(body['error'], 'recipient_history must be a list')

    def test_invalid_day_of_week_type(self):
        event = {
            'recipient_history': [],
            'current_day_of_week': "not an int"
        }
        response = handler(event, None)
        self.assertEqual(response['statusCode'], 400)
        body = json.loads(response['body'])
        self.assertIn('error', body)
        self.assertEqual(body['error'], 'current_day_of_week must be an integer between 0 and 6')

    def test_invalid_day_of_week_range(self):
        event = {
            'recipient_history': [],
            'current_day_of_week': 7
        }
        response = handler(event, None)
        self.assertEqual(response['statusCode'], 400)
        body = json.loads(response['body'])
        self.assertIn('error', body)
        self.assertEqual(body['error'], 'current_day_of_week must be an integer between 0 and 6')

if __name__ == '__main__':
    unittest.main()
