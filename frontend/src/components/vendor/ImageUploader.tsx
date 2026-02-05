// frontend/src/components/vendor/ImageUploader.tsx
// Composant upload d'images pour les produits vendeur

import { useState, useRef } from 'react';
import { Upload, X, Star, Image as ImageIcon } from 'lucide-react';
import { vendorsApi, type ProductImage } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';

interface ImageUploaderProps {
  productId: number;
  images: ProductImage[];
  onImagesChange: () => void;
}

export default function ImageUploader({ productId, images, onImagesChange }: ImageUploaderProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validation
    if (!file.type.startsWith('image/')) {
      showToast('Veuillez sélectionner une image', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('L\'image ne doit pas dépasser 5 MB', 'error');
      return;
    }

    try {
      setUploading(true);
      const isPrimary = images.length === 0;
      await vendorsApi.uploadImage(productId, file, isPrimary);
      showToast('Image ajoutée avec succès', 'success');
      onImagesChange();
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      showToast('Erreur lors de l\'upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm('Supprimer cette image ?')) return;

    try {
      await vendorsApi.deleteImage(productId, imageId);
      showToast('Image supprimée', 'success');
      onImagesChange();
    } catch (error) {
      console.error('Erreur suppression:', error);
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    try {
      await vendorsApi.setPrimaryImage(productId, imageId);
      showToast('Image principale définie', 'success');
      onImagesChange();
    } catch (error) {
      console.error('Erreur:', error);
      showToast('Erreur lors de la modification', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Zone d'upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full glass border-2 border-dashed border-white/10 rounded-xl p-8 hover:border-holo-cyan transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <>
                <div className="w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin" />
                <p className="text-dark-text-secondary">Upload en cours...</p>
              </>
            ) : (
              <>
                <Upload className="text-dark-text-tertiary" size={48} />
                <p className="text-dark-text-secondary">
                  Cliquez pour ajouter une image
                </p>
                <p className="text-dark-text-tertiary text-sm">
                  PNG, JPG, WEBP (max 5 MB)
                </p>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Liste des images */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group glass rounded-xl overflow-hidden border border-white/10"
            >
              {/* Image */}
              <div className="aspect-square bg-dark-bg-secondary">
                <img
                  src={image.image_url}
                  alt="Produit"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Badge principale */}
              {image.is_primary && (
                <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-holo-cyan text-white text-xs font-semibold flex items-center gap-1">
                  <Star size={12} fill="currentColor" />
                  Principale
                </div>
              )}

              {/* Actions (visible au hover) */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.is_primary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(image.id)}
                    className="p-2 rounded-lg bg-holo-cyan hover:bg-holo-cyan/80 transition-colors"
                    title="Définir comme principale"
                  >
                    <Star size={16} className="text-white" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(image.id)}
                  className="p-2 rounded-lg bg-red-500 hover:bg-red-600 transition-colors"
                  title="Supprimer"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-xl p-12 text-center">
          <ImageIcon className="text-dark-text-tertiary mx-auto mb-3" size={48} />
          <p className="text-dark-text-secondary">Aucune image pour ce produit</p>
          <p className="text-dark-text-tertiary text-sm mt-2">
            Ajoutez au moins une image pour rendre le produit visible
          </p>
        </div>
      )}
    </div>
  );
}