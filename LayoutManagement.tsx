import React from 'react';
import { LayoutConfig } from '../types';
import { Layout, Move, Maximize, MousePointer2 } from 'lucide-react';

interface LayoutManagementProps {
  layoutConfig: LayoutConfig;
  onUpdateLayoutConfig: (config: LayoutConfig) => void;
}

export const LayoutManagement: React.FC<LayoutManagementProps> = ({ layoutConfig, onUpdateLayoutConfig }) => {
  const handleChange = (field: keyof LayoutConfig, value: any) => {
    onUpdateLayoutConfig({ ...layoutConfig, [field]: value });
  };

  const handlePositionChange = (type: 'addButton' | 'viewCollectionButton' | 'widget', axis: 'top' | 'left', value: string) => {
    const configKey = type === 'addButton' ? 'addButtonPosition' : type === 'viewCollectionButton' ? 'viewCollectionButtonPosition' : 'widgetPosition';
    onUpdateLayoutConfig({
      ...layoutConfig,
      [configKey]: { ...layoutConfig[configKey], [axis]: value }
    });
  };

  return (
    <div className="space-y-12">
      <h2 className="text-3xl font-black text-gray-900 dark:text-white">Layout Customization</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Floating Action Button Settings */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-[#ed1c24] flex items-center justify-center">
              <MousePointer2 className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">Add Button</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-50 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Show Button</span>
              <button 
                onClick={() => handleChange('showAddButton', !layoutConfig.showAddButton)}
                className={`w-12 h-6 rounded-full transition-colors relative ${layoutConfig.showAddButton ? 'bg-[#ed1c24]' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${layoutConfig.showAddButton ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Top Position</label>
                <input 
                  type="text"
                  value={layoutConfig.addButtonPosition.top}
                  onChange={(e) => handlePositionChange('addButton', 'top', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-[#ed1c24] transition-all font-bold text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Left Position</label>
                <input 
                  type="text"
                  value={layoutConfig.addButtonPosition.left}
                  onChange={(e) => handlePositionChange('addButton', 'left', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-[#ed1c24] transition-all font-bold text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* View Collection Button Settings */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
              <Layout className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">Collection Button</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-50 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Show Button</span>
              <button 
                onClick={() => handleChange('showViewCollectionButton', !layoutConfig.showViewCollectionButton)}
                className={`w-12 h-6 rounded-full transition-colors relative ${layoutConfig.showViewCollectionButton ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${layoutConfig.showViewCollectionButton ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Top Position</label>
                <input 
                  type="text"
                  value={layoutConfig.viewCollectionButtonPosition.top}
                  onChange={(e) => handlePositionChange('viewCollectionButton', 'top', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-blue-600 transition-all font-bold text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Left Position</label>
                <input 
                  type="text"
                  value={layoutConfig.viewCollectionButtonPosition.left}
                  onChange={(e) => handlePositionChange('viewCollectionButton', 'left', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-blue-600 transition-all font-bold text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Widget Settings */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
              <Maximize className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">Widget Appearance</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-50 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Glass Effect</span>
              <button 
                onClick={() => handleChange('glassEffect', !layoutConfig.glassEffect)}
                className={`w-12 h-6 rounded-full transition-colors relative ${layoutConfig.glassEffect ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${layoutConfig.glassEffect ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Widget Width</label>
              <input 
                type="text"
                value={layoutConfig.widgetSize.width}
                onChange={(e) => handleChange('widgetSize', { ...layoutConfig.widgetSize, width: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-purple-600 transition-all font-bold text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
