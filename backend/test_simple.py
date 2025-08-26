#!/usr/bin/env python3
"""
Simple test script for Web API Speech Backend
Tests basic functionality without complex audio processing
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api/speech"

def test_health():
    """Test health check endpoint"""
    print("🏥 Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Response: {data}")
            return True
        else:
            print(f"   ❌ Error: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return False

def test_languages():
    """Test languages endpoint"""
    print("\n🌍 Testing languages endpoint...")
    try:
        response = requests.get(f"{API_BASE}/languages", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Total languages: {data.get('total', 0)}")
            print(f"   ✅ First 3 languages: {[lang['name'] for lang in data.get('languages', [])[:3]]}")
            return True
        else:
            print(f"   ❌ Error: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return False

def test_text_to_speech():
    """Test text-to-speech endpoint"""
    print("\n🔊 Testing text-to-speech...")
    try:
        test_text = "Hello, this is a test."
        payload = {
            "text": test_text,
            "speed": 150,
            "volume": 0.9
        }
        
        response = requests.post(f"{API_BASE}/tts", json=payload, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"   ✅ TTS successful!")
                print(f"   ✅ Text length: {data.get('text_length', 0)}")
                print(f"   ✅ Audio data length: {len(data.get('audio_data', ''))}")
                return True
            else:
                print(f"   ❌ Error: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"   ❌ Error: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Simple Test for Web API Speech Backend")
    print("=" * 50)
    
    # Wait for backend to be ready
    print("⏳ Waiting for backend to be ready...")
    time.sleep(2)
    
    tests = [
        test_health,
        test_languages,
        test_text_to_speech
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your Web API is working correctly!")
        print("\n🔗 Available endpoints:")
        print(f"   - GET  {BASE_URL}/health")
        print(f"   - GET  {API_BASE}/languages")
        print(f"   - POST {API_BASE}/tts")
        print(f"   - POST {API_BASE}/transcribe")
        print("\n💡 Speech-to-text will work with browser fallback if backend fails!")
    else:
        print("❌ Some tests failed. Check your backend configuration.")
    
    return passed == total

if __name__ == "__main__":
    main()










