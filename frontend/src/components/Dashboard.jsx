import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, KanbanSquare, Users, LogOut, Menu, X, Tag } from 'lucide-react';
import CalendarView from '@/components/CalendarView';
import KanbanBoard from '@/components/KanbanBoard';
import UserManagement from '@/components/UserManagement';
import TypesManagement from '@/components/TypesManagement';
import OrdersSidebar from '@/components/OrdersSidebar';

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/', icon: Calendar, label: 'Calendario', testId: 'nav-calendar' },
    { path: '/kanban', icon: KanbanSquare, label: 'Kanban', testId: 'nav-kanban' },
  ];

  if (user.role === 'admin') {
    menuItems.push(
      { path: '/types', icon: Tag, label: 'Tipos', testId: 'nav-types' },
      { path: '/users', icon: Users, label: 'Usuarios', testId: 'nav-users' }
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 glass border-r border-white/30 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Panel Control
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
              data-testid="close-sidebar-button"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  data-testid={item.testId}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-white/50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Orders Sidebar - Pedidos Activos */}
          <OrdersSidebar />

          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="mb-4 p-3 bg-white/50 rounded-lg">
              <p className="text-sm text-gray-600">Usuario</p>
              <p className="font-semibold text-gray-900" data-testid="user-name-display">{user.name}</p>
              <p className="text-xs text-gray-500">{user.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
            </div>
            <Button
              onClick={onLogout}
              data-testid="logout-button"
              variant="outline"
              className="w-full justify-start gap-3 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden glass border-b border-white/30 p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            data-testid="open-sidebar-button"
            className="text-gray-600 hover:text-gray-900"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Panel Control
          </h1>
          <div className="w-6"></div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Routes>
            <Route path="/" element={<CalendarView user={user} />} />
            <Route path="/kanban" element={<KanbanBoard user={user} />} />
            {user.role === 'admin' && (
              <>
                <Route path="/types" element={<TypesManagement />} />
                <Route path="/users" element={<UserManagement />} />
              </>
            )}
          </Routes>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Dashboard;