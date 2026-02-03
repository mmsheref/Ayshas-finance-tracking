
import React, { useState } from 'react';
import { CustomExpenseStructure } from '../types';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, DragHandleIcon } from './Icons';

interface ExpenseStructureManagerProps {
    structure: CustomExpenseStructure;
    onSave: (newStructure: CustomExpenseStructure, newBillFlags: string[]) => void;
    initialBillUploadCategories: string[];
}

interface DragItemState {
    type: 'category' | 'item';
    catName: string;
    index: number;
}

const ExpenseStructureManager: React.FC<ExpenseStructureManagerProps> = ({ structure, onSave, initialBillUploadCategories }) => {
    // Deep copy for local state
    const [internalStructure, setInternalStructure] = useState<CustomExpenseStructure>(JSON.parse(JSON.stringify(structure)));
    const [billFlags, setBillFlags] = useState<string[]>(initialBillUploadCategories);
    
    // UI State
    const [openCategories, setOpenCategories] = useState<string[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newItemNames, setNewItemNames] = useState<{ [category: string]: string }>({});
    
    // Drag & Drop State
    const [dragItem, setDragItem] = useState<DragItemState | null>(null);
    const [dragOverInfo, setDragOverInfo] = useState<{ type: 'category' | 'item', index: number, catName?: string } | null>(null);
    
    // Delete Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'category' | 'item', catName: string, itemName?: string } | null>(null);

    const toggleCategory = (catName: string) => {
        setOpenCategories(prev => 
            prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
        );
    };

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        if (internalStructure[newCategoryName.trim()]) {
            alert('Category already exists');
            return;
        }
        setInternalStructure(prev => ({ ...prev, [newCategoryName.trim()]: [] }));
        setNewCategoryName('');
    };

    const handleDeleteCategory = (catName: string) => {
        const newStruct = { ...internalStructure };
        delete newStruct[catName];
        setInternalStructure(newStruct);
        setBillFlags(prev => prev.filter(c => c !== catName));
        setDeleteConfirmation(null);
    };

    const handleAddItem = (catName: string) => {
        const itemName = newItemNames[catName]?.trim();
        if (!itemName) return;
        
        const currentItems = internalStructure[catName];
        if (currentItems.some(i => i.name === itemName)) {
            alert('Item already exists in this category');
            return;
        }

        setInternalStructure(prev => ({
            ...prev,
            [catName]: [...prev[catName], { name: itemName, defaultValue: 0 }]
        }));
        setNewItemNames(prev => ({ ...prev, [catName]: '' }));
    };

    const handleDeleteItem = (catName: string, itemName: string) => {
        setInternalStructure(prev => ({
            ...prev,
            [catName]: prev[catName].filter(i => i.name !== itemName)
        }));
        setDeleteConfirmation(null);
    };
    
    const toggleBillUpload = (catName: string) => {
        setBillFlags(prev => 
            prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
        );
    };

    const saveChanges = () => {
        onSave(internalStructure, billFlags);
    };

    // --- DnD Handlers for Categories ---
    const handleDragStartCategory = (e: React.DragEvent, index: number, catName: string) => {
        setDragItem({ type: 'category', catName, index });
        e.dataTransfer.effectAllowed = 'move';
        
        // Use the card as the drag image instead of just the handle
        const card = e.currentTarget.closest('[data-category-card]');
        if (card) {
            e.dataTransfer.setDragImage(card, 0, 0);
            card.classList.add('opacity-50');
        }
    };

    const handleDragEndCategory = (e: React.DragEvent) => {
        // Cleanup visual opacity
        const cards = document.querySelectorAll('[data-category-card]');
        cards.forEach(c => c.classList.remove('opacity-50'));
        
        setDragItem(null);
        setDragOverInfo(null);
    };

    const handleDragOverCategory = (e: React.DragEvent, index: number) => {
        e.preventDefault(); 
        e.stopPropagation();
        
        if (dragItem?.type !== 'category') return;
        
        if (dragOverInfo?.type !== 'category' || dragOverInfo.index !== index) {
            setDragOverInfo({ type: 'category', index });
        }
    };

    const handleDropCategory = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragItem?.type !== 'category') return;

        const keys = Object.keys(internalStructure);
        const draggedKey = keys[dragItem.index];
        
        // Reorder keys
        const newKeys = [...keys];
        newKeys.splice(dragItem.index, 1);
        newKeys.splice(dropIndex, 0, draggedKey);
        
        // Reconstruct object in new order
        const newStruct: CustomExpenseStructure = {};
        newKeys.forEach(k => newStruct[k] = internalStructure[k]);
        
        setInternalStructure(newStruct);
        handleDragEndCategory(e); // Ensure cleanup
    };

    // --- DnD Handlers for Items ---
    const handleDragStartItem = (e: React.DragEvent, catName: string, index: number) => {
        e.stopPropagation();
        setDragItem({ type: 'item', catName, index });
        e.dataTransfer.effectAllowed = 'move';
        
        const row = e.currentTarget.closest('[data-item-row]');
        if (row) {
            e.dataTransfer.setDragImage(row, 0, 0);
            row.classList.add('opacity-50');
        }
    };

    const handleDragEndItem = (e: React.DragEvent) => {
        e.stopPropagation();
        const rows = document.querySelectorAll('[data-item-row]');
        rows.forEach(r => r.classList.remove('opacity-50'));
        
        setDragItem(null);
        setDragOverInfo(null);
    };

    const handleDragOverItem = (e: React.DragEvent, catName: string, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (dragItem?.type !== 'item' || dragItem.catName !== catName) return;
        
        if (dragOverInfo?.type !== 'item' || dragOverInfo.index !== index || dragOverInfo.catName !== catName) {
            setDragOverInfo({ type: 'item', index, catName });
        }
    };

    const handleDropItem = (e: React.DragEvent, catName: string, dropIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragItem?.type !== 'item' || dragItem.catName !== catName) return;

        const items = [...internalStructure[catName]];
        const [movedItem] = items.splice(dragItem.index, 1);
        items.splice(dropIndex, 0, movedItem);

        setInternalStructure(prev => ({
            ...prev,
            [catName]: items
        }));
        handleDragEndItem(e);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Add Category Section */}
            <div className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="New Category Name" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-grow px-4 py-2 bg-surface-container-high dark:bg-surface-dark-container-high rounded-xl text-surface-on dark:text-surface-on-dark placeholder-surface-on-variant outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark"
                />
                <button 
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                    className="w-10 h-10 flex items-center justify-center bg-primary dark:bg-primary-dark text-white rounded-xl disabled:opacity-50"
                >
                    <PlusIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Categories List */}
            <div className="space-y-3">
                {Object.keys(internalStructure).map((catName, catIndex) => (
                    <div 
                        key={catName} 
                        data-category-card
                        onDragOver={(e) => handleDragOverCategory(e, catIndex)}
                        onDrop={(e) => handleDropCategory(e, catIndex)}
                        className={`bg-surface-container-high dark:bg-surface-dark-container-high rounded-xl overflow-hidden border transition-all duration-200 ${
                            dragOverInfo?.type === 'category' && dragOverInfo.index === catIndex 
                            ? 'border-primary dark:border-primary-dark ring-2 ring-primary/20 dark:ring-primary-dark/20' 
                            : 'border-surface-outline/5 dark:border-surface-outline-dark/5'
                        }`}
                    >
                        <div className="flex items-center justify-between p-3 bg-surface-container-highest/30 dark:bg-surface-dark-container-highest/30">
                            {/* Drag Handle - NOW THE DRAGGABLE ELEMENT */}
                            <div 
                                draggable
                                onDragStart={(e) => handleDragStartCategory(e, catIndex, catName)}
                                onDragEnd={handleDragEndCategory}
                                className="mr-2 cursor-grab active:cursor-grabbing text-surface-on-variant/50 dark:text-surface-on-variant-dark/50 hover:text-surface-on dark:hover:text-surface-on-dark p-2 -ml-2"
                            >
                                <DragHandleIcon className="w-5 h-5" />
                            </div>

                            <button onClick={() => toggleCategory(catName)} className="flex items-center gap-2 font-bold text-surface-on dark:text-surface-on-dark text-sm flex-grow text-left">
                                {openCategories.includes(catName) ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                {catName} ({internalStructure[catName].length})
                            </button>
                            <button onClick={() => setDeleteConfirmation({ type: 'category', catName })} className="p-1.5 text-surface-on-variant dark:text-surface-on-variant-dark hover:text-error dark:hover:text-error-dark transition-colors">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {openCategories.includes(catName) && (
                            <div className="px-3 pb-3 space-y-2">
                                {/* Items List */}
                                {internalStructure[catName].map((item, itemIndex) => (
                                    <div 
                                        key={item.name} 
                                        data-item-row
                                        onDragOver={(e) => handleDragOverItem(e, catName, itemIndex)}
                                        onDrop={(e) => handleDropItem(e, catName, itemIndex)}
                                        className={`grid grid-cols-[auto_1fr_auto] items-center p-2 gap-x-2 rounded bg-surface-container dark:bg-surface-dark-container transition-all ${
                                            dragOverInfo?.type === 'item' && dragOverInfo.catName === catName && dragOverInfo.index === itemIndex
                                            ? 'ring-2 ring-primary/30 dark:ring-primary-dark/30 scale-[0.98]'
                                            : ''
                                        }`}
                                    >
                                        {/* Drag Handle Item - NOW THE DRAGGABLE ELEMENT */}
                                        <div 
                                            draggable
                                            onDragStart={(e) => handleDragStartItem(e, catName, itemIndex)}
                                            onDragEnd={handleDragEndItem}
                                            className="cursor-grab active:cursor-grabbing text-surface-on-variant/30 dark:text-surface-on-variant-dark/30 hover:text-surface-on dark:hover:text-surface-on-dark row-span-2 self-center p-1"
                                        >
                                            <DragHandleIcon className="w-4 h-4" />
                                        </div>

                                        <span className="text-surface-on dark:text-surface-on-dark font-medium break-words leading-tight">{item.name}</span>
                                        <button onClick={() => setDeleteConfirmation({ type: 'item', catName, itemName: item.name })} className="p-1 text-surface-on-variant dark:text-surface-on-variant-dark hover:text-error dark:hover:text-error-dark" aria-label="Delete item">
                                            <TrashIcon className="w-4 h-4"/>
                                        </button>
                                        <div className="relative col-span-2 col-start-2 mt-1">
                                            <input 
                                                type="number" 
                                                placeholder="Default Amount"
                                                value={item.defaultValue || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    setInternalStructure(prev => ({
                                                        ...prev,
                                                        [catName]: prev[catName].map(i => i.name === item.name ? { ...i, defaultValue: isNaN(val) ? 0 : val } : i)
                                                    }));
                                                }}
                                                className="w-full text-xs p-1.5 bg-transparent border-b border-surface-outline/20 dark:border-surface-outline-dark/20 focus:border-primary dark:focus:border-primary-dark outline-none text-surface-on-variant dark:text-surface-on-variant-dark"
                                            />
                                            <span className="absolute right-0 top-1.5 text-[10px] text-surface-on-variant/50">Default</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Item Input */}
                                <div className="flex gap-2 mt-2 pt-2 border-t border-surface-outline/10 dark:border-surface-outline-dark/10">
                                    <input 
                                        type="text" 
                                        placeholder="Add Item..." 
                                        value={newItemNames[catName] || ''}
                                        onChange={(e) => setNewItemNames(prev => ({ ...prev, [catName]: e.target.value }))}
                                        className="flex-grow px-3 py-1.5 text-sm bg-surface-container dark:bg-surface-dark-container rounded-lg outline-none focus:ring-1 focus:ring-primary dark:focus:ring-primary-dark"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem(catName)}
                                    />
                                    <button 
                                        onClick={() => handleAddItem(catName)}
                                        disabled={!newItemNames[catName]?.trim()}
                                        className="px-3 py-1.5 bg-secondary-container dark:bg-secondary-container-dark text-secondary-on-container dark:text-secondary-on-container-dark rounded-lg text-xs font-bold disabled:opacity-50"
                                    >
                                        Add
                                    </button>
                                </div>
                                
                                {/* Category Settings */}
                                <div className="mt-3 pt-2 border-t border-surface-outline/10 dark:border-surface-outline-dark/10">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={billFlags.includes(catName)} 
                                            onChange={() => toggleBillUpload(catName)}
                                            className="w-4 h-4 rounded text-primary dark:text-primary-dark focus:ring-primary dark:focus:ring-primary-dark bg-transparent border-surface-outline/30"
                                        />
                                        <span className="text-xs font-medium text-surface-on-variant dark:text-surface-on-variant-dark">Allow Bill Photo Uploads</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Save Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface dark:bg-surface-dark border-t border-surface-outline/10 dark:border-surface-outline-dark/10 flex justify-end gap-2">
                <button 
                    onClick={saveChanges}
                    className="w-full sm:w-auto px-8 py-3 bg-primary dark:bg-primary-dark text-primary-on dark:text-primary-on-dark rounded-full font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                >
                    Save Changes
                </button>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-surface-container dark:bg-surface-dark-container rounded-2xl p-6 w-full max-w-sm shadow-xl animate-scaleIn">
                        <h3 className="text-lg font-bold text-surface-on dark:text-surface-on-dark mb-2">Confirm Delete</h3>
                        <p className="text-sm text-surface-on-variant dark:text-surface-on-variant-dark mb-6">
                            Are you sure you want to delete the {deleteConfirmation.type} 
                            <span className="font-bold text-error dark:text-error-dark"> "{deleteConfirmation.itemName || deleteConfirmation.catName}"</span>?
                            {deleteConfirmation.type === 'category' && " This will remove all items inside it."}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setDeleteConfirmation(null)}
                                className="px-4 py-2 text-sm font-bold text-surface-on-variant dark:text-surface-on-variant-dark hover:bg-surface-container-highest dark:hover:bg-surface-dark-container-highest rounded-full"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => deleteConfirmation.type === 'category' ? handleDeleteCategory(deleteConfirmation.catName) : handleDeleteItem(deleteConfirmation.catName, deleteConfirmation.itemName!)}
                                className="px-4 py-2 text-sm font-bold bg-error dark:bg-error-dark text-white rounded-full shadow-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseStructureManager;
