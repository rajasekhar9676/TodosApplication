#!/usr/bin/env python3
"""
Simple test script to verify the backend endpoints are working
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_health():
    """Test the health check endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health check: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_languages():
    """Test the languages endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/languages")
        print(f"✅ Languages: {response.status_code} - {len(response.json()['languages'])} languages")
        return True
    except Exception as e:
        print(f"❌ Languages failed: {e}")
        return False

def test_text_to_speech():
    """Test the text-to-speech endpoint"""
    try:
        data = {
            "text": "Hello, this is a test of the text to speech system.",
            "speed": 150,
            "volume": 0.9
        }
        response = requests.post(f"{BASE_URL}/text-to-speech", json=data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Text-to-speech: {response.status_code} - Audio data length: {len(result.get('audio_data', ''))}")
            return True
        else:
            print(f"❌ Text-to-speech failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Text-to-speech error: {e}")
        return False

def main():
    print("🧪 Testing Backend Endpoints")
    print("=" * 40)
    
    tests = [
        ("Health Check", test_health),
        ("Languages", test_languages),
        ("Text-to-Speech", test_text_to_speech),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔍 Testing {test_name}...")
        if test_func():
            passed += 1
        else:
            print(f"❌ {test_name} test failed")
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the backend logs for more details.")

if __name__ == "__main__":
    main()







