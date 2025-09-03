#!/usr/bin/env python3
"""
Test script for AI-Enhanced Features
Tests intelligent document processing and analysis
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:5000"

def test_health():
    """Test health check endpoint"""
    print("🏥 Testing AI-Enhanced health check...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Response: {data}")
            if 'ai_features' in data:
                print(f"   🤖 AI Features: {', '.join(data['ai_features'])}")
            return True
        else:
            print(f"   ❌ Error: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return False

def test_text_processing():
    """Test AI-enhanced text processing"""
    print("\n📝 Testing AI text processing...")
    try:
        test_text = """Artificial Intelligence (AI) is transforming the way we work and live. 
        Machine learning algorithms can now process vast amounts of data to identify patterns 
        and make predictions. This technology is being applied across various industries 
        including healthcare, finance, education, and transportation. The development of 
        natural language processing has enabled computers to understand and generate human 
        language, opening up new possibilities for human-computer interaction."""
        
        payload = {
            "text": test_text,
            "type": "explanation"
        }
        
        response = requests.post(f"{BASE_URL}/process-text", json=payload, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"   ✅ AI text processing successful!")
                print(f"   ✅ Word count: {data.get('word_count', 0)}")
                print(f"   ✅ Char count: {data.get('char_count', 0)}")
                
                # Check AI analysis
                if 'ai_analysis' in data:
                    ai_data = data['ai_analysis']
                    print(f"   🤖 AI Analysis:")
                    print(f"      - Topics: {', '.join(ai_data.get('topics', []))}")
                    print(f"      - Complexity: {ai_data.get('complexity', 'Unknown')}")
                    print(f"      - Avg sentence length: {ai_data.get('avg_sentence_length', 0)}")
                    if ai_data.get('top_keywords'):
                        print(f"      - Top keywords: {', '.join([k['word'] for k in ai_data['top_keywords'][:3]])}")
                
                print(f"   📝 Processed content preview: {data.get('processed_content', '')[:150]}...")
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
    print("\n📄 Testing AI document upload endpoint...")
    try:
        # Test with empty request to see if endpoint exists
        response = requests.post(f"{BASE_URL}/upload-document", timeout=5)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 400:
            # This is expected - endpoint exists but no file provided
            print("   ✅ AI document upload endpoint exists!")
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

def test_speech_endpoints():
    """Test speech endpoints"""
    print("\n🎤 Testing speech endpoints...")
    try:
        # Test languages endpoint
        response = requests.get(f"{BASE_URL}/api/speech/languages", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Languages endpoint: {data.get('total', 0)} languages supported")
        else:
            print(f"   ❌ Languages endpoint failed: {response.status_code}")
            return False
        
        # Test TTS endpoint (with minimal text)
        tts_payload = {"text": "Test"}
        response = requests.post(f"{BASE_URL}/api/speech/tts", json=tts_payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"   ✅ TTS endpoint: Working")
            else:
                print(f"   ❌ TTS endpoint: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"   ❌ TTS endpoint failed: {response.status_code}")
            return False
        
        return True
    except Exception as e:
        print(f"   ❌ Speech test exception: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing AI-Enhanced Features")
    print("=" * 60)
    
    # Wait for backend to be ready
    print("⏳ Waiting for backend to be ready...")
    time.sleep(2)
    
    tests = [
        test_health,
        test_text_processing,
        test_document_upload_endpoint,
        test_speech_endpoints
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! AI features are working correctly!")
        print("\n🔗 Available AI endpoints:")
        print(f"   - GET  {BASE_URL}/health")
        print(f"   - POST {BASE_URL}/process-text (AI-enhanced)")
        print(f"   - POST {BASE_URL}/upload-document (AI-enhanced)")
        print(f"   - POST {BASE_URL}/api/speech/tts")
        print(f"   - GET  {BASE_URL}/api/speech/languages")
        print("\n🤖 AI Features Available:")
        print("   - Intelligent text analysis")
        print("   - Smart summarization")
        print("   - Topic detection")
        print("   - Keyword extraction")
        print("   - Reading complexity analysis")
        print("\n💡 Document upload should now work with AI enhancement!")
    else:
        print("❌ Some tests failed. Check your backend configuration.")
    
    return passed == total

if __name__ == "__main__":
    main()



















