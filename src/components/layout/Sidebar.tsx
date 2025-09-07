import React from 'react';

interface SidebarProps {
  activeSection: 'recipes' | 'import';
  onSectionChange: (section: 'recipes' | 'import') => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeSection, 
  onSectionChange, 
  className = '' 
}) => {
  const sections = [
    {
      id: 'recipes' as const,
      label: 'Recipes',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      description: 'View your recipe library'
    },
    {
      id: 'import' as const,
      label: 'Import',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      ),
      description: 'Import recipes from URLs'
    }
  ];

  return (
    <div className={`w-64 bg-gradient-to-b from-orange-50 to-amber-50 border-r border-orange-200 h-full shadow-sm ${className}`}>
      <div className="p-6">
        <h2 className="text-xl font-bold text-amber-900 mb-8 tracking-tight">
          Recipe Manager
        </h2>
        
        <nav className="space-y-3">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`w-full flex items-center space-x-4 px-5 py-4 rounded-xl text-left transition-all duration-200 group ${
                activeSection === section.id
                  ? 'bg-gradient-to-r from-orange-200 to-amber-200 text-amber-900 border border-orange-300 shadow-md transform scale-105'
                  : 'text-amber-700 hover:bg-gradient-to-r hover:from-orange-100 hover:to-amber-100 hover:text-amber-900 hover:shadow-sm hover:transform hover:scale-102'
              }`}
            >
              <div className={`p-2 rounded-lg ${
                activeSection === section.id
                  ? 'bg-amber-300 text-amber-900'
                  : 'bg-orange-200 text-amber-700 group-hover:bg-orange-300'
              } transition-colors duration-200`}>
                {section.icon}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">{section.label}</div>
                <div className={`text-sm ${
                  activeSection === section.id
                    ? 'text-amber-700'
                    : 'text-amber-600 group-hover:text-amber-700'
                }`}>
                  {section.description}
                </div>
              </div>
            </button>
          ))}
        </nav>
        
        {/* Decorative element */}
        <div className="mt-12 pt-6 border-t border-orange-200">
          <div className="text-center text-xs text-amber-600 opacity-60">
            Cooking made simple
          </div>
        </div>
      </div>
    </div>
  );
};