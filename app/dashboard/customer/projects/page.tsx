'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

interface Booking {
  id: number;
  request_id: string;
  bin_type_name: string;
  bin_size: string;
  status: string;
  estimated_price?: string;
  total_price?: string;
  start_date: string;
  end_date: string;
  order_items_count: number;
  items?: any[];
  service_category?: string;
  service_names?: string;
  selected_services_count?: number;
}

export default function CustomerProjectsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectOrders, setProjectOrders] = useState<Booking[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Form states
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ projects: Project[] }>('/projects/my');
      if (response.success && response.data) {
        setProjects(response.data.projects || []);
      }
    } catch (error) {
      showToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectOrders = async (projectId: number) => {
    setLoadingOrders(true);
    try {
      const response = await api.get<{ requests: Booking[] }>(`/projects/${projectId}/orders`);
      if (response.success && response.data) {
        setProjectOrders(response.data.requests || []);
      }
    } catch (error) {
      showToast('Failed to load project orders', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setSubmitting(true);
    try {
      const response = await api.post('/projects', {
        name: newName.trim(),
        description: newDescription.trim()
      });
      
      if (response.success) {
        showToast('Project created successfully', 'success');
        setCreateModalOpen(false);
        setNewName('');
        setNewDescription('');
        fetchProjects();
      } else {
        showToast(response.message || 'Failed to create project', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete project "${project.name}"?`)) return;
    
    try {
      const response = await api.delete(`/projects/${project.id}`);
      if (response.success) {
        showToast('Project deleted successfully', 'success');
        fetchProjects();
        if (selectedProject?.id === project.id) {
          setDetailsModalOpen(false);
        }
      } else {
        showToast(response.message || 'Failed to delete project', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const openProjectDetails = (project: Project) => {
    setSelectedProject(project);
    setDetailsModalOpen(true);
    fetchProjectOrders(project.id);
  };

  const filteredProjects = projects.filter(p => 
    !searchQuery || 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on_delivery': case 'delivered': case 'pickup': return 'bg-green-100 text-green-700';
      case 'ready_to_pickup': return 'bg-orange-100 text-orange-700';
      case 'confirmed': case 'awaiting_payment': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatStatus = (status: string) =>
    status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const displayName = (b: Booking) =>
    b.service_category === 'service'
      ? (b.service_names?.split(',')[0] || 'General Service') + ((b.selected_services_count || 0) > 1 ? ` (+${(b.selected_services_count || 0) - 1})` : '')
      : b.items && b.items.length > 0
        ? `${b.items[0].bin_type_name}${b.items[0].bin_size ? ` - ${b.items[0].bin_size}` : ''}`
        : `${b.bin_type_name}${b.bin_size ? ` - ${b.bin_size}` : ''}`;

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>My Projects</h1>
            <p className="text-gray-500 mt-1">Group and organize your bin orders</p>
          </div>
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Project
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3.5 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search projects..."
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm" 
          />
        </div>

        {/* Project List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}></div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No projects found</p>
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="mt-3 inline-block text-green-600 font-medium text-sm hover:underline"
            >
              Create your first project →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map(project => (
              <div 
                key={project.id} 
                onClick={() => openProjectDetails(project)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project); }}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg truncate mb-1">{project.name}</h3>
                  <p className="text-gray-500 text-sm line-clamp-2 h-10 mb-4">{project.description || 'No description provided'}</p>
                  <div className="flex items-center text-xs text-gray-400 border-t border-gray-50 pt-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setCreateModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Create New Project</h3>
              <button onClick={() => setCreateModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                  <input 
                    type="text" 
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="E.g. Downtown Office Renovation"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="Add details about this project..."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none"
                  />
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting || !newName.trim()}
                  className="flex-1 py-3 px-4 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}
                >
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {detailsModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDetailsModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedProject.name}</h3>
                  <p className="text-sm text-gray-500">Created {new Date(selectedProject.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDeleteProject(selectedProject)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete Project"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button onClick={() => setDetailsModalOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6">
              {selectedProject.description && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 bg-gray-50 p-4 rounded-xl text-sm">{selectedProject.description}</p>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Orders in this Project</h4>
                <Link 
                  href="/dashboard/customer/order" 
                  className="text-sm font-medium text-green-600 hover:underline flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Order
                </Link>
              </div>
              
              {loadingOrders ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-8 h-8 border-2 rounded-full animate-spin border-green-500 border-t-transparent"></div>
                </div>
              ) : projectOrders.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-gray-500 mb-2">No orders assigned to this project yet.</p>
                  <p className="text-xs text-gray-400">You can assign orders to projects when placing a commercial order.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-green-200 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 truncate">{displayName(order)}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>#{order.request_id}</span>
                          <span>{new Date(order.start_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Link 
                        href={`/dashboard/customer/tracking?id=${order.id}`}
                        className="flex-shrink-0 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Track
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
