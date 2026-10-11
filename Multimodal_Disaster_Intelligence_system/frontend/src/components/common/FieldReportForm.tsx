import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, MapPin, Send, X } from 'lucide-react';
import axios from 'axios';

interface FieldReportFormProps {
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export const FieldReportForm: React.FC<FieldReportFormProps> = ({ onClose, onSubmitSuccess }) => {
  const [reportType, setReportType] = useState('LANDSLIDE');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Use a hardcoded location for demo purposes, or try to get geolocation
  const [location, setLocation] = useState<{lat: number, lng: number} | null>({lat: 26.14, lng: 91.73});

  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log('Geolocation error:', err)
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !location) {
      setError('Description and location are required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('locationName', `Lat: ${location.lat}, Lng: ${location.lng}`);
      formData.append('coordinates', JSON.stringify(location));
      formData.append('reportType', reportType);
      formData.append('description', description);
      formData.append('reporterPhone', phone);
      if (file) {
        formData.append('image', file);
      }
      
      await axios.post('/api/community/report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      onSubmitSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-900/30 p-4 py-6 backdrop-blur-sm sm:items-center">
      <div className="my-auto flex max-h-[calc(100dvh-3rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white bg-white shadow-[0_24px_80px_rgba(15,23,42,.24)]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 text-slate-900">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Camera className="h-5 w-5 text-indigo-600" />
            Submit a field report
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 text-slate-700">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Hazard type</label>
              <select 
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="LANDSLIDE">Landslide</option>
                <option value="FLOODING">Flooding</option>
                <option value="BLOCKED_ROAD">Blocked Road / Infrastructure Damage</option>
              </select>
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">What are you seeing?</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you see..."
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Upload photo <span className="font-medium text-slate-400">(optional)</span></label>
              <input 
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2 text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Contact phone</label>
                <input 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Detected location</label>
                <div className="flex h-[44px] items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Locating...'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:opacity-70"
          >
            {loading ? 'Submitting...' : (
              <>
                <Send className="h-4 w-4" /> Submit Report
              </>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
