import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Bell, Route, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const role = user?.role || '';

  const navItems = [
    {
      name: t.nav.controlTower,
      path: '/',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'CONTROL_OPERATOR', 'FIELD_OFFICER', 'DRIVER'],
    },
    {
      name: t.nav.fieldReport,
      path: '/field-report',
      icon: FileText,
      roles: ['ADMIN', 'CONTROL_OPERATOR', 'FIELD_OFFICER'],
    },
    {
      name: 'Alerts',
      path: '/alerts',
      icon: Bell,
      roles: ['ADMIN', 'CONTROL_OPERATOR', 'FIELD_OFFICER', 'DRIVER'],
    },
    {
      name: 'Routes',
      path: '/routes',
      icon: Route,
      roles: ['ADMIN', 'CONTROL_OPERATOR', 'FIELD_OFFICER', 'DRIVER'],
    },
    {
      name: 'Incidents',
      path: '/incidents',
      icon: ShieldAlert,
      roles: ['ADMIN', 'CONTROL_OPERATOR', 'FIELD_OFFICER'],
    },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(role) || !role);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-2 py-1.5 flex items-center justify-around pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition ${
                isActive
                  ? 'text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
