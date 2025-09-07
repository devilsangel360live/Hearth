import React, { useState, useRef, useCallback } from 'react';
import { Recipe, Ingredient, Instruction } from '@/types';
import { getRecipeImageUrl } from '@/utils/helpers';

interface RecipeEditProps {
  recipe: Recipe;
  onSave: (updatedRecipe: Partial<Recipe>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const RecipeEdit: React.FC<RecipeEditProps> = ({
  recipe,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<Partial<Recipe>>({
    title: recipe.title || '',
    image: recipe.image || '',
    summary: recipe.summary || '',
    readyInMinutes: recipe.readyInMinutes || 30,
    servings: recipe.servings || 4,
    ingredients: (recipe.ingredients || []).map(ing => ({
      ...ing,
      id: ing.id || `ing-${Date.now()}-${Math.random()}`,
      name: ing.name || '',
      amount: ing.amount || 0,
      unit: ing.unit || '',
      original: ing.original || ''
    })),
    instructions: (recipe.instructions || []).map(inst => ({
      ...inst,
      step: inst.step || ''
    })),
    cuisines: recipe.cuisines || [],
    diets: recipe.diets || [],
    tags: recipe.tags || [],
    vegetarian: recipe.vegetarian || false,
    vegan: recipe.vegan || false,
    glutenFree: recipe.glutenFree || false,
    dairyFree: recipe.dairyFree || false,
  });

  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback((field: keyof Recipe, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addIngredient = () => {
    const newIngredient: Ingredient = {
      id: `new-${Date.now()}`,
      name: '',
      amount: 0,
      unit: '',
      original: '',
    };
    handleInputChange('ingredients', [...(formData.ingredients || []), newIngredient]);
  };

  const updateIngredient = useCallback((index: number, field: keyof Ingredient, value: any) => {
    setFormData(prev => {
      const newIngredients = (prev.ingredients || []).map((ing, i) => {
        if (i === index) {
          const updated = { ...ing, [field]: value };
          if (field === 'name' || field === 'amount' || field === 'unit') {
            updated.original = `${updated.amount || ''} ${updated.unit || ''} ${updated.name || ''}`.trim();
          }
          return updated;
        }
        return ing;
      });
      return { ...prev, ingredients: newIngredients };
    });
  }, []);

  const removeIngredient = (index: number) => {
    const ingredients = [...(formData.ingredients || [])];
    ingredients.splice(index, 1);
    handleInputChange('ingredients', ingredients);
  };

  const addInstruction = () => {
    const newInstruction: Instruction = {
      number: (formData.instructions?.length || 0) + 1,
      step: '',
    };
    handleInputChange('instructions', [...(formData.instructions || []), newInstruction]);
  };

  const updateInstruction = useCallback((index: number, step: string) => {
    setFormData(prev => {
      const newInstructions = (prev.instructions || []).map((inst, i) => {
        if (i === index) {
          return { ...inst, step };
        }
        return inst;
      });
      return { ...prev, instructions: newInstructions };
    });
  }, []);

  const removeInstruction = (index: number) => {
    const instructions = [...(formData.instructions || [])];
    instructions.splice(index, 1);
    // Renumber remaining instructions
    instructions.forEach((inst, i) => {
      inst.number = i + 1;
    });
    handleInputChange('instructions', instructions);
  };

  const addTag = () => {
    const tagInput = document.getElementById('new-tag-input') as HTMLInputElement;
    const tagValue = tagInput?.value.trim();
    if (tagValue && !(formData.tags || []).includes(tagValue)) {
      handleInputChange('tags', [...(formData.tags || []), tagValue]);
      tagInput.value = '';
    }
  };

  const removeTag = (index: number) => {
    const tags = [...(formData.tags || [])];
    tags.splice(index, 1);
    handleInputChange('tags', tags);
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let updateData = { ...formData };
    
    // If there's a new image file, we would need to handle upload
    // For now, we'll just use the preview URL or keep existing image
    if (newImageFile && newImagePreview) {
      updateData.image = newImagePreview;
    }

    
    await onSave(updateData);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Recipe</h1>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="recipe-edit-form"
            disabled={isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors duration-200"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <form id="recipe-edit-form" onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recipe Title
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Summary/Description
            </label>
            <textarea
              value={formData.summary || ''}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cook Time (minutes)
              </label>
              <input
                type="number"
                value={formData.readyInMinutes || 0}
                onChange={(e) => handleInputChange('readyInMinutes', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Servings
              </label>
              <input
                type="number"
                value={formData.servings || 1}
                onChange={(e) => handleInputChange('servings', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recipe Image
          </label>
          <div className="flex items-center space-x-4">
            <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src={newImagePreview || getRecipeImageUrl(recipe, 'medium')}
                alt="Recipe"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                Change Image
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Upload a new image or keep the existing one
              </p>
            </div>
          </div>
        </div>

        {/* Diet Preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dietary Information
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'vegetarian', label: 'Vegetarian' },
              { key: 'vegan', label: 'Vegan' },
              { key: 'glutenFree', label: 'Gluten Free' },
              { key: 'dairyFree', label: 'Dairy Free' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData[key as keyof Recipe] as boolean || false}
                  onChange={(e) => handleInputChange(key as keyof Recipe, e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Custom Tags
          </label>
          <div className="space-y-3">
            {/* Existing Tags */}
            {(formData.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(formData.tags || []).map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-full text-sm font-medium"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add New Tag */}
            <div className="flex items-center space-x-2">
              <input
                id="new-tag-input"
                type="text"
                placeholder="Add a custom tag..."
                onKeyDown={handleTagKeyPress}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Add Tag
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Press Enter or click "Add Tag" to add custom tags like "family favorite", "quick meal", "comfort food", etc.
            </p>
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Ingredients</h3>
            <button
              type="button"
              onClick={addIngredient}
              className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200"
            >
              Add Ingredient
            </button>
          </div>
          <div className="space-y-3">
            {(formData.ingredients || []).map((ingredient, index) => (
              <div key={`ingredient-${ingredient.id || index}-${ingredient.name || 'empty'}`} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <input
                  type="number"
                  step="0.1"
                  value={ingredient.amount || ''}
                  onChange={(e) => updateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Amount"
                />
                <input
                  type="text"
                  value={ingredient.unit || ''}
                  onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                  className="w-24 p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Unit"
                />
                <input
                  type="text"
                  value={ingredient.name || ''}
                  onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Ingredient name"
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Instructions</h3>
            <button
              type="button"
              onClick={addInstruction}
              className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200"
            >
              Add Step
            </button>
          </div>
          <div className="space-y-3">
            {(formData.instructions || []).map((instruction, index) => (
              <div key={`instruction-${instruction.number}-${index}`} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {instruction.number}
                </div>
                <textarea
                  value={instruction.step || ''}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  rows={2}
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Describe this cooking step..."
                />
                <button
                  type="button"
                  onClick={() => removeInstruction(index)}
                  className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};