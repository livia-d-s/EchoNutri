import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MicIcon, UserIcon, HistoryIcon, AppLogo } from './Icons';
import { useAppContext } from '../context/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { doctorProfile, setDoctorProfile, resetSession } = useAppContext();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState(doctorProfile.name);
  const [editSpecialty, setEditSpecialty] = useState(doctorProfile.specialty);
  const [editImage, setEditImage] = useState(doctorProfile.imageUrl || '');
  
  const isActive = (path: string) => location.pathname === path;

  const handleNavigateHome = () => {
    resetSession();
    navigate('/');
  };

  const handleOpenProfile = () => {
    setEditName(doctorProfile.name);
    setEditSpecialty(doctorProfile.specialty);
    setEditImage(doctorProfile.imageUrl || '');
    setIsProfileOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setDoctorProfile({
      ...doctorProfile,
      name: editName,
      specialty: editSpecialty,
      imageUrl: editImage
    });
    setIsProfileOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={handleNavigateHome}
          >
            <AppLogo className="w-9 h-9 flex-shrink-0" />
            <span className="text-2xl font-bold tracking-tight text-slate-800">EchoNutri</span>
          </div>

          <nav className="flex items-center gap-6">
            <button
              onClick={handleNavigateHome}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                isActive('/') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MicIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Transcrição</span>
            </button>
             <button
              onClick={() => navigate('/history')}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                isActive('/history') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <HistoryIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </button>
          </nav>

          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleOpenProfile}
          >
             <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-700">{doctorProfile.name}</p>
                <p className="text-[10px] text-slate-500">{doctorProfile.specialty}</p>
             </div>
             <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden">
                {doctorProfile.imageUrl ? (
                  <img src={doctorProfile.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5" />
                )}
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Perfil do Médico</h2>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Foto de Perfil</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {editImage ? (
                      <img src={editImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 transition-colors">
                    Escolher foto
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ex: Dr. Alexandre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Especialidade</label>
                <select 
                  value={editSpecialty}
                  onChange={(e) => setEditSpecialty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="Cardiologista">Cardiologista</option>
                  <option value="Clínico Geral">Clínico Geral</option>
                  <option value="Dermatologista">Dermatologista</option>
                  <option value="Pediatra">Pediatra</option>
                  <option value="Neurologista">Neurologista</option>
                  <option value="Ortopedista">Ortopedista</option>
                  <option value="Psiquiatra">Psiquiatra</option>
                  <option value="Nutricionista">Nutricionista</option>
                  <option value="Fisioterapeuta">Fisioterapeuta</option>
                  <option value="Dentista">Dentista</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsProfileOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;