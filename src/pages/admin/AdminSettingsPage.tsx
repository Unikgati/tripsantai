import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { AppSettings, HeroSlide } from '../../types';
import { UploadCloudIcon, XIcon, EditIcon, ChevronDownIcon, ChevronUpIcon, SpinnerIcon } from '../../components/Icons';
import uploadToCloudinary from '../../lib/cloudinary';
import getSupabaseClient, { fetchAppSettings } from '../../lib/supabase';
import { ConfirmationModal } from '../../components/ConfirmationModal';


interface AdminSettingsPageProps {
    appSettings: AppSettings;
    onSaveSettings: (settings: AppSettings) => void;
}

const HeroSlideEditor: React.FC<{
    slides: HeroSlide[];
    onSlidesChange: (slides: HeroSlide[]) => void;
}> = ({ slides, onSlidesChange }) => {
    const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(0);
    const [slideToDelete, setSlideToDelete] = useState<number | null>(null); // Index of the slide to delete
    const [slideUploadProgress, setSlideUploadProgress] = useState<Record<number, number>>({});

    const toggleSlide = (index: number) => {
        setActiveSlideIndex(prevIndex => (prevIndex === index ? null : index));
    };

    const handleSlideChange = (index: number, field: 'title' | 'subtitle', value: string) => {
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], [field]: value };
        onSlidesChange(newSlides);
    };

    const handleSlideImageUpload = async (index: number, file: File) => {
        // show a local preview quickly while uploading
        const objectUrl = URL.createObjectURL(file);
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], imageUrl: objectUrl };
        onSlidesChange(newSlides);

        try {
            setSlideUploadProgress(p => ({ ...p, [index]: 0 }));
            const uploadedUrl = await uploadToCloudinary(file, (pct: number) => setSlideUploadProgress(p => ({ ...p, [index]: pct })));
            const updated = [...newSlides];
            updated[index] = { ...updated[index], imageUrl: uploadedUrl };
            onSlidesChange(updated);
        } catch (err) {
            console.warn('[CLOUDINARY] slide upload failed, keeping preview', err);
            // keep the local preview (objectUrl). Do not replace with base64.
        } finally {
            setSlideUploadProgress(p => {
                const copy = { ...p };
                delete copy[index];
                return copy;
            });
        }
    };

    const addSlide = () => {
        const newSlide: HeroSlide = {
            id: Date.now(),
            title: 'Judul Baru',
            subtitle: 'Subjudul baru yang menarik.',
            imageUrl: ''
        };
        const newSlides = [...slides, newSlide];
        onSlidesChange(newSlides);
        setActiveSlideIndex(newSlides.length - 1); // Open the new slide
    };

    const handleDeleteRequest = (index: number) => {
        setSlideToDelete(index);
    };

    const handleConfirmDelete = () => {
        if (slideToDelete === null) return;

        const newSlides = slides.filter((_, index) => index !== slideToDelete);
        onSlidesChange(newSlides);

        if (activeSlideIndex === slideToDelete) {
            setActiveSlideIndex(null);
        }
        setSlideToDelete(null); // Close modal
    };

    return (
        <>
            <div className="itinerary-editor" style={{padding: 0, border: 'none', background: 'transparent'}}>
                {slides.map((slide, index) => {
                    const isOpen = activeSlideIndex === index;
                    return (
                        <div key={slide.id} className="itinerary-editor-item">
                            <div 
                                className="itinerary-editor-header"
                                onClick={() => toggleSlide(index)}
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, minWidth: 0 }}>
                                    {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                    <h4 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        Slide {index + 1}: {slide.title}
                                    </h4>
                                </div>
                                <button 
                                    type="button" 
                                    className="btn btn-danger btn-small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRequest(index);
                                    }}
                                >
                                    Hapus
                                </button>
                            </div>
                            {isOpen && (
                                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginTop: '0.75rem' }}>
                                    <div className="form-group">
                                        <label htmlFor={`slide-title-${index}`}>Judul</label>
                                        <input
                                            type="text"
                                            id={`slide-title-${index}`}
                                            className="setting-input"
                                            value={slide.title}
                                            onChange={(e) => handleSlideChange(index, 'title', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor={`slide-subtitle-${index}`}>Subjudul</label>
                                        <input
                                            type="text"
                                            id={`slide-subtitle-${index}`}
                                            className="setting-input"
                                            value={slide.subtitle}
                                            onChange={(e) => handleSlideChange(index, 'subtitle', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Gambar Latar</label>
                                        <div className="image-upload-grid" style={{ gridTemplateColumns: 'minmax(150px, 250px)' }}>
                                            {slide.imageUrl ? (
                                                <div className="image-preview-item">
                                                    <img src={slide.imageUrl} alt={`Preview Slide ${index + 1}`} />
                                                    <div className="image-actions" style={{ opacity: 1, gap: '8px' }}>
                                                        <button
                                                            type="button"
                                                            className="image-action-btn"
                                                            title="Ganti Gambar"
                                                            onClick={() => document.getElementById(`slide-image-input-${index}`)?.click()}
                                                        >
                                                            <EditIcon />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="upload-placeholder"
                                                    onClick={() => document.getElementById(`slide-image-input-${index}`)?.click()}
                                                >
                                                    <UploadCloudIcon />
                                                    <span>Unggah Gambar</span>
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            id={`slide-image-input-${index}`}
                                            className="hidden-file-input"
                                            accept="image/*"
                                            onChange={(e) => e.target.files && e.target.files[0] && handleSlideImageUpload(index, e.target.files[0])}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
                <button type="button" className="btn btn-secondary" onClick={addSlide} style={{alignSelf: 'flex-start'}}>Tambah Slide Baru</button>
            </div>
            {slideToDelete !== null && (
                <ConfirmationModal
                    isOpen={slideToDelete !== null}
                    onClose={() => setSlideToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Konfirmasi Penghapusan"
                    confirmButtonText="Hapus"
                    confirmButtonVariant="danger"
                >
                    <p>Apakah Anda yakin ingin menghapus <strong>Slide {slideToDelete + 1}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
                </ConfirmationModal>
            )}
        </>
    );
};


export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ appSettings, onSaveSettings }) => {
    const [localSettings, setLocalSettings] = useState<AppSettings>(appSettings);
    const { showToast } = useToast();
    // Keep localSettings in sync when parent provides updated appSettings (e.g., loaded from Supabase)
    useEffect(() => {
        setLocalSettings(appSettings);
    }, [appSettings]);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    
    const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (file: File, key: keyof AppSettings) => {
        // immediate preview using object URL
        const objectUrl = URL.createObjectURL(file);
        setLocalSettings(prev => ({ ...prev, [key]: objectUrl }));
        try {
            setUploadProgress(p => ({ ...p, [String(key)]: 0 }));
            const uploadedUrl = await uploadToCloudinary(file, (pct: number) => setUploadProgress(p => ({ ...p, [String(key)]: pct })));
            setLocalSettings(prev => ({ ...prev, [key]: uploadedUrl }));
        } catch (err) {
            console.warn('[CLOUDINARY] upload failed for', key, err);
            // keep object URL preview but do not persist base64
        } finally {
            setUploadProgress(p => {
                const copy = { ...p };
                delete copy[String(key)];
                return copy;
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof AppSettings) => {
        if (e.target.files && e.target.files[0]) {
            handleImageUpload(e.target.files[0], key);
        }
    };
    
    const handleRemoveImage = async (key: keyof AppSettings) => {
        // remove locally
        const updated = { ...localSettings, [key]: '' } as AppSettings;
        setLocalSettings(updated);
        setIsSaving(true);

        // call parent save handler optimistically
        try {
            onSaveSettings(updated);
        } catch (err) {
            console.warn('onSaveSettings threw', err);
        }

        // Also attempt a direct Supabase update to ensure the DB reflects removal.
        // This is a best-effort fallback and will re-sync settings from server after.
        try {
            const supabase = getSupabaseClient();
            // Map AppSettings keys to DB column names used in upsertAppSettings
            const keyMap: Record<string, string> = {
                logoLightUrl: 'logolighturl',
                logoDarkUrl: 'logodarkurl',
                favicon16Url: 'favicon16url',
                favicon192Url: 'favicon192url',
                favicon512Url: 'favicon512url',
            };
            const dbCol = keyMap[String(key)] ?? String(key).toLowerCase();
            const { error } = await supabase.from('app_settings').update({ [dbCol]: '' }).eq('id', 1);
            if (error) {
                console.warn('[SUPABASE] direct update failed', error.message || error);
            } else {
                // refetch canonical settings and sync parent
                try {
                    const remote = await fetchAppSettings();
                    if (remote) onSaveSettings(remote);
                } catch (e) {
                    console.warn('[SUPABASE] failed to re-fetch settings after removal', e);
                }
            }
        } catch (err) {
            console.warn('[SUPABASE] remove-image fallback failed', err);
        } finally {
            // brief delay so user sees saving indicator
            setTimeout(() => setIsSaving(false), 800);
        }
    };

    const handleSave = () => {
        // Prevent saving if any image fields still contain object URLs or data URIs (upload in progress or failed)
        const containsPreviewUrl = (val: any) => typeof val === 'string' && (val.startsWith('blob:') || val.startsWith('data:'));
        const problematic = Object.keys(localSettings).some(k => {
            const v: any = (localSettings as any)[k];
            if (containsPreviewUrl(v)) return true;
            return false;
        }) || (localSettings.heroSlides || []).some(s => containsPreviewUrl(s.imageUrl));

        if (problematic) {
            // simple UX: inform the user to wait for uploads to finish
            // do not proceed with saving to avoid storing local object/data URLs in the DB
            // (a more advanced UX could wire upload progress into the parent)
            showToast('Ada gambar yang masih dalam proses upload atau hanya preview lokal. Tunggu sampai upload selesai sebelum menyimpan.', 'error');
            return;
        }

        setIsSaving(true);
        setTimeout(() => {
            onSaveSettings(localSettings);
            setIsSaving(false);
        }, 1500);
    };


    return (
        <div className="settings-page-container">
            {/* Branding Settings */}
            <section className="settings-section">
                <h3>Branding</h3>
                <div className="setting-item">
                    <div className="setting-item-label">
                        Nama Brand
                    </div>
                    <div className="setting-item-control">
                        <input 
                            type="text" 
                            name="brandName" 
                            className="setting-input" 
                            value={localSettings.brandName} 
                            onChange={handleSettingChange} 
                        />
                    </div>
                </div>
                <div className="setting-item">
                    <div className="setting-item-label">
                        Tagline
                    </div>
                    <div className="setting-item-control">
                        <input 
                            type="text" 
                            name="tagline" 
                            className="setting-input" 
                            value={localSettings.tagline} 
                            onChange={handleSettingChange} 
                        />
                    </div>
                </div>
            </section>
            
            {/* Contact & Social Media Settings */}
            <section className="settings-section">
                <h3>Informasi Kontak & Sosial Media</h3>
                <div className="setting-item">
                    <div className="setting-item-label">Email Kontak</div>
                    <div className="setting-item-control"><input type="email" name="email" className="setting-input" value={localSettings.email} onChange={handleSettingChange} /></div>
                </div>
                <div className="setting-item">
                    <div className="setting-item-label">Alamat</div>
                    <div className="setting-item-control"><input type="text" name="address" className="setting-input" value={localSettings.address} onChange={handleSettingChange} /></div>
                </div>
                <div className="setting-item">
                    <div className="setting-item-label">Nomor WhatsApp</div>
                    <div className="setting-item-control"><input type="tel" name="whatsappNumber" className="setting-input" value={localSettings.whatsappNumber} onChange={handleSettingChange} placeholder="cth: 6281234567890" /></div>
                </div>
                <div className="setting-item">
                    <div className="setting-item-label">URL Facebook</div>
                    <div className="setting-item-control"><input type="url" name="facebookUrl" className="setting-input" value={localSettings.facebookUrl} onChange={handleSettingChange} placeholder="https://facebook.com/username" /></div>
                </div>
                <div className="setting-item">
                    <div className="setting-item-label">URL Instagram</div>
                    <div className="setting-item-control"><input type="url" name="instagramUrl" className="setting-input" value={localSettings.instagramUrl} onChange={handleSettingChange} placeholder="https://instagram.com/username" /></div>
                </div>
                 <div className="setting-item">
                    <div className="setting-item-label">URL Twitter (X)</div>
                    <div className="setting-item-control"><input type="url" name="twitterUrl" className="setting-input" value={localSettings.twitterUrl} onChange={handleSettingChange} placeholder="https://x.com/username" /></div>
                </div>
            </section>
            
            {/* Payment Information Settings */}
            <section className="settings-section">
                <h3>Informasi Pembayaran</h3>
                <div className="setting-item">
                    <div className="setting-item-label">Nama Bank</div>
                    <div className="setting-item-control"><input type="text" name="bankName" className="setting-input" value={localSettings.bankName} onChange={handleSettingChange} placeholder="cth: Bank Central Asia" /></div>
                </div>
                 <div className="setting-item">
                    <div className="setting-item-label">Nomor Rekening</div>
                    <div className="setting-item-control"><input type="text" name="bankAccountNumber" className="setting-input" value={localSettings.bankAccountNumber} onChange={handleSettingChange} placeholder="cth: 1234567890" /></div>
                </div>
                 <div className="setting-item">
                    <div className="setting-item-label">Atas Nama</div>
                    <div className="setting-item-control"><input type="text" name="bankAccountHolder" className="setting-input" value={localSettings.bankAccountHolder} onChange={handleSettingChange} placeholder="cth: PT Wisata Indonesia" /></div>
                </div>
            </section>

            {/* Theme Settings */}
            <section className="settings-section">
                <h3>Tema</h3>
                <div className="setting-item">
                    <div className="setting-item-label">
                        Warna Aksen
                    </div>
                    <div className="setting-item-control">
                        <input type="color" name="accentColor" value={localSettings.accentColor} onChange={handleSettingChange} />
                    </div>
                </div>
            </section>
            
            {/* Logo Settings */}
            <section className="settings-section">
                <h3>Logo</h3>
                <div className="setting-item">
                     <div className="setting-item-label">
                        Logo (Mode Terang)
                    </div>
                    <div className="setting-item-control">
                        <div className="image-preview logo-preview">
                            {localSettings.logoLightUrl ? <img src={localSettings.logoLightUrl} alt="Logo Preview" loading="lazy" decoding="async"/> : 'Teks'}
                        </div>
                        <div className="file-upload-wrapper">
                            <button className="btn btn-secondary">Unggah</button>
                            <input type="file" className="file-upload-input" accept="image/*" onChange={(e) => handleFileChange(e, 'logoLightUrl')} />
                            {uploadProgress['logoLightUrl'] !== undefined && (
                                <div className="upload-progress">Mengunggah {uploadProgress['logoLightUrl']}%</div>
                            )}
                        </div>
                        {localSettings.logoLightUrl && (
                           <button className="btn btn-danger btn-small" onClick={() => handleRemoveImage('logoLightUrl')}>Hapus</button>
                        )}
                    </div>
                </div>
                 <div className="setting-item">
                     <div className="setting-item-label">
                        Logo (Mode Gelap)
                    </div>
                    <div className="setting-item-control">
                        <div className="image-preview logo-preview">
                            {localSettings.logoDarkUrl ? <img src={localSettings.logoDarkUrl} alt="Logo Preview" loading="lazy" decoding="async"/> : 'Teks'}
                        </div>
                        <div className="file-upload-wrapper">
                            <button className="btn btn-secondary">Unggah</button>
                            <input type="file" className="file-upload-input" accept="image/*" onChange={(e) => handleFileChange(e, 'logoDarkUrl')} />
                            {uploadProgress['logoDarkUrl'] !== undefined && (
                                <div className="upload-progress">Mengunggah {uploadProgress['logoDarkUrl']}%</div>
                            )}
                        </div>
                        {localSettings.logoDarkUrl && (
                           <button className="btn btn-danger btn-small" onClick={() => handleRemoveImage('logoDarkUrl')}>Hapus</button>
                        )}
                    </div>
                </div>
            </section>
            
            {/* Favicon Settings */}
            <section className="settings-section">
                <h3>Favicon</h3>
                <div className="setting-item">
                    <div className="setting-item-label">
                        Ikon Situs
                    </div>
                    <div className="setting-item-control">
                        <div className="favicon-upload-grid">
                            {/* 16x16 */}
                            <div className="favicon-item">
                                <strong>16x16</strong>
                                <div className="image-preview favicon-preview-16">
                                    {localSettings.favicon16Url && <img src={localSettings.favicon16Url} alt="Favicon 16x16" loading="lazy" decoding="async"/>}
                                </div>
                                <div className="file-upload-wrapper">
                                    <button className="btn btn-secondary btn-small">Pilih</button>
                                    <input type="file" className="file-upload-input" accept="image/png" onChange={(e) => handleFileChange(e, 'favicon16Url')} />
                                    {uploadProgress['favicon16Url'] !== undefined && (
                                        <div className="upload-progress">Mengunggah {uploadProgress['favicon16Url']}%</div>
                                    )}
                                </div>
                                          {localSettings.favicon16Url && (
                                              <button className="btn btn-danger btn-small" onClick={() => handleRemoveImage('favicon16Url')}>Hapus</button>
                                          )}
                            </div>
                            {/* 192x192 */}
                             <div className="favicon-item">
                                <strong>192x192</strong>
                                <div className="image-preview favicon-preview-192">
                                     {localSettings.favicon192Url && <img src={localSettings.favicon192Url} alt="Favicon 192x192" loading="lazy" decoding="async"/>}
                                </div>
                                <div className="file-upload-wrapper">
                                    <button className="btn btn-secondary btn-small">Pilih</button>
                                    <input type="file" className="file-upload-input" accept="image/png" onChange={(e) => handleFileChange(e, 'favicon192Url')} />
                                    {uploadProgress['favicon192Url'] !== undefined && (
                                        <div className="upload-progress">Mengunggah {uploadProgress['favicon192Url']}%</div>
                                    )}
                                </div>
                                          {localSettings.favicon192Url && (
                                              <button className="btn btn-danger btn-small" onClick={() => handleRemoveImage('favicon192Url')}>Hapus</button>
                                          )}
                            </div>
                            {/* 512x512 */}
                            <div className="favicon-item">
                                <strong>512x512</strong>
                                <div className="image-preview favicon-preview-192">
                                     {localSettings.favicon512Url && <img src={localSettings.favicon512Url} alt="Favicon 512x512" loading="lazy" decoding="async"/>}
                                </div>
                                <div className="file-upload-wrapper">
                                    <button className="btn btn-secondary btn-small">Pilih</button>
                                    <input type="file" className="file-upload-input" accept="image/png" onChange={(e) => handleFileChange(e, 'favicon512Url')} />
                                    {uploadProgress['favicon512Url'] !== undefined && (
                                        <div className="upload-progress">Mengunggah {uploadProgress['favicon512Url']}%</div>
                                    )}
                                </div>
                                          {localSettings.favicon512Url && (
                                              <button className="btn btn-danger btn-small" onClick={() => handleRemoveImage('favicon512Url')}>Hapus</button>
                                          )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Hero Section Settings */}
            <section className="settings-section">
                <h3>Pengaturan Hero Section</h3>
                <HeroSlideEditor 
                    slides={localSettings.heroSlides} 
                    onSlidesChange={(newSlides) => setLocalSettings(prev => ({ ...prev, heroSlides: newSlides }))}
                />
            </section>

            <section className="settings-section" style={{ background: 'transparent', border: 'none', padding: '1rem 0 0 0', boxShadow: 'none' }}>
                 <div className="form-actions" style={{justifyContent: 'flex-end', marginTop: 0}}>
                    <button type="button" className={`btn btn-primary btn-large ${isSaving ? 'loading' : ''}`} onClick={handleSave} disabled={isSaving}>
                        {isSaving && <SpinnerIcon />}
                        <span>Simpan Pengaturan</span>
                    </button>
                </div>
            </section>
        </div>
    );
};