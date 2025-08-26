#!/usr/bin/env python3
"""
Test script for Python 3.13 compatible backend
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_health():
    """Test the health check endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health check: {response.status_code}")
        data = response.json()
        print(f"   Status: {data.get('status')}")
        print(f"   TTS Engine: {data.get('tts_engine')}")
        print(f"   Python Version: {data.get('python_version')}")
        print(f"   Note: {data.get('note')}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_status():
    """Test the status endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/status")
        print(f"✅ Status: {response.status_code}")
        data = response.json()
        print(f"   Python Version: {data.get('python_version')}")
        print(f"   TTS Engine: {data.get('tts_engine')}")
        print(f"   Speech Recognition: {data.get('speech_recognition')}")
        return True
    except Exception as e:
        print(f"❌ Status failed: {e}")
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

def test_transcribe_disabled():
    """Test that transcribe endpoint is properly disabled"""
    try:
        data = {"audio": "test", "language": "en-US"}
        response = requests.post(f"{BASE_URL}/transcribe", json=data)
        if response.status_code == 501:
            result = response.json()
            print(f"✅ Transcribe properly disabled: {response.status_code}")
            print(f"   Message: {result.get('error')}")
            return True
        else:
            print(f"❌ Transcribe should be disabled but returned: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Transcribe test error: {e}")
        return False

def main():
    print("🧪 Testing Python 3.13 Compatible Backend")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health),
        ("Status", test_status),
        ("Languages", test_languages),
        ("Text-to-Speech", test_text_to_speech),
        ("Transcribe Disabled", test_transcribe_disabled),
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
        print("🎉 All tests passed! Python 3.13 backend is working correctly.")
        print("\n📝 Note: Speech-to-text will use browser-based recognition")
        print("🔊 Text-to-speech: Fully functional")
    else:
        print("⚠️  Some tests failed. Check the backend logs for more details.")

if __name__ == "__main__":
    main()











