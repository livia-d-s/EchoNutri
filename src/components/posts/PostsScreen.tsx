import React, { useState, useEffect } from 'react';
import { Plus, ExternalLink, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { FirestorePost } from '../../../types';
import { useAuth } from '../../context/AuthContext';
import {
  getPostsByNutritionist,
  createPost,
  updatePost,
  deletePost,
  assignPostToPatients,
  removePostFromPatient,
} from '../../services/firestoreNewSchema';

interface PostsScreenProps {
  patients: any[];
}

export const PostsScreen: React.FC<PostsScreenProps> = ({ patients }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FirestorePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostDescription, setNewPostDescription] = useState('');
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [echoConteudoUrl, setEchoConteudoUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('echoConteudoUrl') || 'http://localhost:5173';
    }
    return 'http://localhost:5173';
  });

  useEffect(() => {
    loadPosts();
  }, [user]);

  const loadPosts = async () => {
    if (!user?.uid) return;
    try {
      const userPosts = await getPostsByNutritionist(user.uid);
      setPosts(userPosts);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user?.uid || !newPostTitle.trim()) return;

    setSaving(true);
    try {
      const post = await createPost(user.uid, {
        patientIds: selectedPatientIds,
        title: newPostTitle,
        description: newPostDescription,
        status: 'draft',
      });

      setPosts([post, ...posts]);
      setNewPostTitle('');
      setNewPostDescription('');
      setSelectedPatientIds([]);
      setShowNewPostForm(false);
    } catch (err) {
      console.error('Failed to create post:', err);
      alert('Erro ao criar post');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (postId: string) => {
    try {
      await updatePost(postId, { status: 'published' });
      setPosts(posts.map(p => p.id === postId ? { ...p, status: 'published' } : p));
    } catch (err) {
      console.error('Failed to publish post:', err);
    }
  };

  const handleUnpublish = async (postId: string) => {
    try {
      await updatePost(postId, { status: 'draft' });
      setPosts(posts.map(p => p.id === postId ? { ...p, status: 'draft' } : p));
    } catch (err) {
      console.error('Failed to unpublish post:', err);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Tem certeza que deseja deletar este post?')) return;

    try {
      await deletePost(postId);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const getPatientNames = (patientIds: string[]): string => {
    return patientIds
      .map(id => patients.find(p => p.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'Nenhum paciente';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-ink-tertiary">Carregando posts...</div>
      </div>
    );
  }

  const handleSaveEchoConteudoUrl = (newUrl: string) => {
    setEchoConteudoUrl(newUrl);
    localStorage.setItem('echoConteudoUrl', newUrl);
  };

  return (
    <div className="space-y-6">
      {/* EchoConteúdo Setup Info */}
      <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle size={16} className="text-brand-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-brand-900">
            <p className="font-semibold mb-2">EchoConteúdo — Gerador de Carrosséis IA</p>
            <p className="mb-3">Configure a URL do seu gerador de conteúdo:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={echoConteudoUrl}
                onChange={(e) => setEchoConteudoUrl(e.target.value)}
                placeholder="Ex: http://localhost:5173 ou https://seu-dominio.com"
                className="flex-1 px-3 py-2 border border-brand-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 bg-surface text-ink-primary placeholder-ink-tertiary"
              />
              <button
                onClick={() => handleSaveEchoConteudoUrl(echoConteudoUrl)}
                className="px-4 py-2 bg-brand-700 text-white text-sm rounded hover:bg-brand-800 transition-colors font-medium"
              >
                Salvar
              </button>
            </div>
            <p className="text-2xs text-brand-800 mt-2 font-medium">
              📝 Padrão: http://localhost:5173 (desenvolvimento) ou configure com sua URL de produção
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-ink-primary">Geração de Posts</h2>
          <p className="text-sm text-ink-tertiary mt-1">Crie carrosséis de conteúdo usando IA e compartilhe com seus pacientes</p>
        </div>
        <button
          onClick={() => setShowNewPostForm(true)}
          className="flex items-center gap-2 bg-brand-700 text-white px-4 py-2 rounded-md hover:bg-brand-800 transition-colors font-semibold"
        >
          <Plus size={16} />
          Novo Post
        </button>
      </div>

      {/* New Post Form */}
      {showNewPostForm && (
        <div className="bg-surface border border-line rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-ink-primary">Criar Novo Post</h3>

          <div>
            <label className="text-sm font-medium text-ink-secondary block mb-1">Título</label>
            <input
              type="text"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              placeholder="Ex: Hidratação e Performance"
              className="w-full px-3 py-2 border border-line rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 bg-surface text-ink-primary placeholder-ink-tertiary"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink-secondary block mb-1">Descrição (opcional)</label>
            <textarea
              value={newPostDescription}
              onChange={(e) => setNewPostDescription(e.target.value)}
              placeholder="Descrição do conteúdo do post..."
              className="w-full px-3 py-2 border border-line rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 resize-none bg-surface text-ink-primary placeholder-ink-tertiary"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink-secondary block mb-2">Pacientes a Atribuir (opcional)</label>
            <div className="space-y-2 max-h-48 overflow-y-auto bg-subtle rounded p-3">
              {patients.length > 0 ? (
                patients.map(patient => (
                  <label key={patient.id} className="flex items-center gap-2 cursor-pointer hover:bg-base/50 p-1.5 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedPatientIds.includes(patient.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPatientIds([...selectedPatientIds, patient.id]);
                        } else {
                          setSelectedPatientIds(selectedPatientIds.filter(id => id !== patient.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-brand-700 accent-brand-700"
                    />
                    <span className="text-sm text-ink-primary">{patient.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-ink-tertiary py-2">Nenhum paciente disponível</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowNewPostForm(false);
                setNewPostTitle('');
                setNewPostDescription('');
                setSelectedPatientIds([]);
              }}
              className="px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-subtle rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreatePost}
              disabled={!newPostTitle.trim() || saving}
              className="px-4 py-2 text-sm font-medium bg-brand-700 text-white rounded-md hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Criando...' : 'Criar Post'}
            </button>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="bg-surface border border-line rounded-lg p-8 text-center">
            <p className="text-ink-tertiary text-sm">Nenhum post criado ainda. Comece criando seu primeiro post!</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-surface border border-line rounded-lg p-4 hover:border-brand-700 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-ink-primary">{post.title}</h3>
                    <span className={`text-2xs font-medium px-2 py-1 rounded-md ${
                      post.status === 'published'
                        ? 'bg-positive/20 text-positive'
                        : 'bg-subtle text-ink-tertiary'
                    }`}>
                      {post.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>

                  {post.description && (
                    <p className="text-sm text-ink-secondary mb-2">{post.description}</p>
                  )}

                  <div className="text-2xs text-ink-tertiary space-y-1">
                    <p>Pacientes: {getPatientNames(post.patientIds)}</p>
                    <p>Criado em: {new Date(post.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <a
                    href={echoConteudoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-subtle rounded-md text-brand-700 transition-colors"
                    title="Abrir EchoConteúdo"
                  >
                    <ExternalLink size={16} />
                  </a>

                  {post.status === 'draft' ? (
                    <button
                      onClick={() => handlePublish(post.id)}
                      className="p-2 hover:bg-subtle rounded-md text-positive transition-colors"
                      title="Publicar"
                    >
                      <Eye size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnpublish(post.id)}
                      className="p-2 hover:bg-subtle rounded-md text-ink-tertiary transition-colors"
                      title="Despublicar"
                    >
                      <EyeOff size={16} />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-2 hover:bg-critical/10 rounded-md text-critical transition-colors"
                    title="Deletar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="bg-positive/10 border border-positive/20 rounded-lg p-4">
        <p className="text-sm text-positive">
          💡 <strong>Como usar:</strong> Crie um novo post acima, depois clique no ícone 🔗 para acessar o EchoConteúdo e gerar o carrossel. Os posts podem ser salvos como rascunho e publicados depois para aparecer no app dos seus pacientes.
        </p>
      </div>
    </div>
  );
};
