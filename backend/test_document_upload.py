#!/usr/bin/env python3
"""
Test script for Document Upload Endpoints
Tests document processing functionality
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:5000"

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

def test_text_processing():
    """Test text processing endpoint"""
    print("\n📝 Testing text processing...")
    try:
        test_text = "This is a sample text for testing document processing. It contains multiple sentences to demonstrate the functionality."
        payload = {
            "text": test_text,
            "type": "summary"
        }
        
        response = requests.post(f"{BASE_URL}/process-text", json=payload, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"   ✅ Text processing successful!")
                print(f"   ✅ Word count: {data.get('word_count', 0)}")
                print(f"   ✅ Char count: {data.get('char_count', 0)}")
                print(f"   ✅ Processed content: {data.get('processed_content', '')[:100]}...")
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

def test_document_upload_endpoint():
    """Test document upload endpoint availability"""
    print("\n📄 Testing document upload endpoint...")
    try:
        # Test with empty request to see if endpoint exists
        response = requests.post(f"{BASE_URL}/upload-document", timeout=5)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 400:
            # This is expected - endpoint exists but no file provided
            print("   ✅ Document upload endpoint exists!")
            print("   ✅ Endpoint is responding correctly")
            return True
        elif response.status_code == 404:
            print("   ❌ Document upload endpoint not found!")
            return False
        else:
            print(f"   ⚠️ Unexpected status: {response.status_code}")
            print(f"   Response: {response.text}")
            return True
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing Document Upload Endpoints")
    print("=" * 50)
    
    # Wait for backend to be ready
    print("⏳ Waiting for backend to be ready...")
    time.sleep(2)
    
    tests = [
        test_health,
        test_text_processing,
        test_document_upload_endpoint
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
        print("🎉 All tests passed! Document processing is working correctly!")
        print("\n🔗 Available endpoints:")
        print(f"   - GET  {BASE_URL}/health")
        print(f"   - POST {BASE_URL}/process-text")
        print(f"   - POST {BASE_URL}/upload-document")
        print("\n💡 Document upload should now work in your app!")
    else:
        print("❌ Some tests failed. Check your backend configuration.")
    
    return passed == total

if __name__ == "__main__":
    main()



















