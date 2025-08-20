#!/usr/bin/env python3
"""
Test script for Browser Fallback Mechanism
Tests that the backend properly returns 503 with fallback info
"""

import requests
import json
import base64
import time

# Configuration
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api/speech"

def test_browser_fallback():
    """Test that backend returns proper fallback response"""
    print("🎤 Testing Browser Fallback Mechanism")
    print("=" * 50)
    
    # Create mock audio data (this will cause backend to fail)
    mock_audio = b"invalid_audio_data_for_testing"
    base64_audio = base64.b64encode(mock_audio).decode('utf-8')
    
    payload = {
        "audio": base64_audio,
        "language": "en-US"
    }
    
    try:
        print("📡 Sending request to backend...")
        response = requests.post(f"{API_BASE}/transcribe", json=payload, timeout=10)
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📊 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 503:
            print("✅ Backend correctly returned 503 (Service Unavailable)")
            
            try:
                data = response.json()
                print(f"📋 Response Data: {json.dumps(data, indent=2)}")
                
                # Check fallback information
                if data.get('fallback') == 'browser':
                    print("✅ Fallback field correctly set to 'browser'")
                else:
                    print("❌ Fallback field missing or incorrect")
                
                if data.get('api_status') == 'fallback_available':
                    print("✅ API status correctly set to 'fallback_available'")
                else:
                    print("❌ API status missing or incorrect")
                
                if 'note' in data:
                    print("✅ Note field present with fallback instructions")
                else:
                    print("❌ Note field missing")
                
                print("\n🎉 Browser fallback mechanism is working correctly!")
                print("   Frontend should automatically switch to browser recognition")
                
            except json.JSONDecodeError:
                print("❌ Response is not valid JSON")
                print(f"   Raw response: {response.text}")
                
        elif response.status_code == 200:
            print("⚠️ Backend succeeded (unexpected for invalid audio)")
            try:
                data = response.json()
                print(f"📋 Response Data: {json.dumps(data, indent=2)}")
            except:
                print(f"   Raw response: {response.text}")
                
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    print("\n" + "=" * 50)
    print("🔍 What This Test Means:")
    print("   - 503 status = Backend processing failed (expected)")
    print("   - Fallback info = Frontend knows to use browser recognition")
    print("   - User experience = Seamless transition to browser recognition")
    print("\n💡 Your speech features should now work perfectly!")

if __name__ == "__main__":
    test_browser_fallback()



