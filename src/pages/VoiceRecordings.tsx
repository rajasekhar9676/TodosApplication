import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config';
import { useAuth } from '../context/AuthContext';
import SpeechToText from '../components/SpeechToText';

interface VoiceNote {
  id: string;
  text: string;
  language: string;
  createdAt: any;
  userId: string;
  duration?: string;
  detectedLanguage?: string;
}

const VoiceRecordings: React.FC = () => {
  const { user } = useAuth();
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecorder, setShowRecorder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'language'>('newest');

  useEffect(() => {
    if (!user) return;

    const voiceNotesQuery = query(
      collection(db, 'voiceNotes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(voiceNotesQuery, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VoiceNote[];
      setVoiceNotes(notes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this voice note?')) {
      try {
        await deleteDoc(doc(db, 'voiceNotes', noteId));
      } catch (error) {
        console.error('Error deleting voice note:', error);
      }
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getLanguageDisplay = (langCode: string) => {
    const languageMap: { [key: string]: string } = {
      'en-US': '🇺🇸 English',
      'en-IN': '🇮🇳 English (India)',
      'hi-IN': '🇮🇳 हिन्दी',
      'te-IN': '🇮🇳 తెలుగు',
      'ta-IN': '🇮🇳 தமிழ்',
      'kn-IN': '🇮🇳 ಕನ್ನಡ',
      'ml-IN': '🇮🇳 മലയാളം',
      'tcy-IN': '🇮🇳 ತುಳು',
      'bn-IN': '🇮🇳 বাংলা',
      'gu-IN': '🇮🇳 ગુજરાતી',
      'mr-IN': '🇮🇳 मराठी',
      'pa-IN': '🇮🇳 ਪੰਜਾਬੀ',
      'ur-IN': '🇮🇳 اردو',
      'or-IN': '🇮🇳 ଓଡ଼ିଆ',
      'as-IN': '🇮🇳 অসমীয়া',
    };
    return languageMap[langCode] || langCode;
  };

  // Filter and sort notes
  const filteredNotes = voiceNotes
    .filter(note => {
      const matchesSearch = note.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLanguage = selectedLanguage === 'all' || note.language === selectedLanguage;
      return matchesSearch && matchesLanguage;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.createdAt?.toDate() - b.createdAt?.toDate();
        case 'language':
          return a.language.localeCompare(b.language);
        case 'newest':
        default:
          return b.createdAt?.toDate() - a.createdAt?.toDate();
      }
    });

  // Get unique languages for filter
  const uniqueLanguages = Array.from(new Set(voiceNotes.map(note => note.language)));

  const stats = {
    total: voiceNotes.length,
    languages: uniqueLanguages.length,
    totalWords: voiceNotes.reduce((acc, note) => acc + note.text.split(' ').length, 0),
    recentNotes: voiceNotes.filter(note => {
      const noteDate = note.createdAt?.toDate();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return noteDate && noteDate > weekAgo;
    }).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎤 Voice Recordings</h1>
              <p className="text-gray-600 mt-1">Manage your speech-to-text recordings</p>
            </div>
            <button
              onClick={() => setShowRecorder(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              🎙️ New Recording
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Recordings</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Languages Used</p>
                <p className="text-3xl font-bold text-green-600">{stats.languages}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Words</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalWords.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-3xl font-bold text-orange-600">{stats.recentNotes}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Search</label>
              <input
                type="text"
                placeholder="Search in recordings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🌐 Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Languages</option>
                {uniqueLanguages.map(lang => (
                  <option key={lang} value={lang}>{getLanguageDisplay(lang)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📊 Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'language')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="language">By Language</option>
              </select>
            </div>
          </div>
        </div>

        {/* Voice Notes Grid */}
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recordings found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'Try adjusting your search criteria' : 'Start by creating your first voice recording'}
            </p>
            <button
              onClick={() => setShowRecorder(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🎙️ Create First Recording
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <div key={note.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          {getLanguageDisplay(note.language)}
                        </span>
                        {note.duration && (
                          <span className="text-xs text-gray-500">{note.duration}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{formatDate(note.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Delete recording"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-gray-800 leading-relaxed line-clamp-6">
                      {note.text}
                    </p>
                  </div>

                  <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                    <span>{note.text.split(' ').length} words</span>
                    {note.detectedLanguage && note.detectedLanguage !== note.language && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Detected: {note.detectedLanguage}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Speech to Text Modal */}
      {showRecorder && (
        <SpeechToText onClose={() => setShowRecorder(false)} />
      )}
    </div>
  );
};

export default VoiceRecordings;

