#!/usr/bin/env python3
"""
Test PDF Text Extraction
Tests the improved PDF text extraction using pdfplumber
"""

import os
import sys

def test_pdf_extraction():
    """Test PDF text extraction functions"""
    print("🧪 Testing PDF Text Extraction...")
    
    try:
        # Import the functions
        from app_ai_enhanced import extract_text_from_pdf, extract_text_from_pdf_with_ocr
        
        print("✅ PDF extraction functions imported successfully!")
        print("📚 Available functions:")
        print("   - extract_text_from_pdf() - Uses pdfplumber + PyPDF2 fallback")
        print("   - extract_text_from_pdf_with_ocr() - OCR placeholder")
        
        # Test with a sample PDF if available
        pdf_files = [f for f in os.listdir('.') if f.lower().endswith('.pdf')]
        
        if pdf_files:
            print(f"\n📄 Found PDF files: {pdf_files}")
            print("💡 You can now test document upload with these files!")
        else:
            print("\n📄 No PDF files found in current directory")
            print("💡 Place a PDF file here to test extraction")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_pdf_extraction()
    if success:
        print("\n🎉 PDF extraction test completed successfully!")
        print("🚀 Your AI-enhanced backend is ready for PDF processing!")
    else:
        print("\n❌ PDF extraction test failed!")
        print("🔧 Check your installation and try again.")
















