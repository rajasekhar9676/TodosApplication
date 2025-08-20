#!/usr/bin/env python3
"""
Setup script for the Speech-to-Text backend
"""

import subprocess
import sys
import os

def install_requirements():
    """Install Python requirements"""
    print("Installing Python requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Requirements installed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing requirements: {e}")
        return False
    return True

def check_pyaudio():
    """Check if PyAudio is properly installed"""
    try:
        import pyaudio
        print("✅ PyAudio is installed and working!")
        return True
    except ImportError:
        print("❌ PyAudio not found. Trying to install...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "PyAudio"])
            print("✅ PyAudio installed successfully!")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to install PyAudio automatically.")
            print("Please install it manually:")
            print("  Windows: pip install PyAudio")
            print("  macOS: brew install portaudio && pip install PyAudio")
            print("  Linux: sudo apt-get install python3-pyaudio")
            return False

def main():
    print("🎤 Setting up Speech-to-Text Backend")
    print("=" * 40)
    
    # Install requirements
    if not install_requirements():
        return
    
    # Check PyAudio
    if not check_pyaudio():
        return
    
    print("\n✅ Setup completed successfully!")
    print("\nTo start the backend server, run:")
    print("  python app.py")
    print("\nThe server will be available at: http://localhost:5000")

if __name__ == "__main__":
    main() 