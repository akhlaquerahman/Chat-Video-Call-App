import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../Styles/MediaViewer.css';

const isImage = (type = '') => type.startsWith('image');
const isVideo = (type = '') => type.startsWith('video');
const isAudio = (type = '') => type.startsWith('audio');
const isPdf = (item) => item?.fileType === 'application/pdf' || item?.fileName?.toLowerCase().endsWith('.pdf') || item?.filePath?.toLowerCase().includes('.pdf');

const normalizeMedia = (media) => {
    if (!media) return [];
    if (Array.isArray(media.items)) return media.items;
    if (media.filePath) {
        return [{
            filePath: media.filePath,
            fileType: media.fileType,
            fileName: media.fileName || 'media',
        }];
    }
    return [];
};

const MediaViewer = ({ media, onClose, onDelete }) => {
    const items = useMemo(() => normalizeMedia(media), [media]);
    const [activeIndex, setActiveIndex] = useState(media?.initialIndex || 0);
    const [zoomed, setZoomed] = useState(false);
    const [pinchScale, setPinchScale] = useState(1);
    const touchStartRef = useRef(null);
    const pinchStartRef = useRef(null);

    const activeItem = items[activeIndex];
    const canNavigate = items.length > 1;
    const canDelete = Boolean(media?.canDelete && media?.messageId);

    useEffect(() => {
        setActiveIndex(media?.initialIndex || 0);
        setZoomed(false);
    }, [media]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'ArrowLeft') move(-1);
            if (event.key === 'ArrowRight') move(1);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    if (!activeItem) {
        return null;
    }

    function move(direction) {
        if (!canNavigate) return;
        setZoomed(false);
        setPinchScale(1);
        setActiveIndex(prev => (prev + direction + items.length) % items.length);
    }

    const getTouchDistance = (touches) => {
        const first = touches[0];
        const second = touches[1];
        return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
    };

    const handleTouchStart = (event) => {
        if (event.touches.length === 2) {
            pinchStartRef.current = getTouchDistance(event.touches);
            return;
        }

        const touch = event.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (event) => {
        if (event.touches.length !== 2 || !pinchStartRef.current) return;

        const nextScale = getTouchDistance(event.touches) / pinchStartRef.current;
        setPinchScale(Math.min(Math.max(nextScale, 1), 3));
    };

    const handleTouchEnd = (event) => {
        if (pinchStartRef.current) {
            setZoomed(pinchScale > 1.08);
            if (pinchScale <= 1.08) setPinchScale(1);
            pinchStartRef.current = null;
            return;
        }

        if (!touchStartRef.current) return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;

        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
            move(deltaX > 0 ? -1 : 1);
        }

        touchStartRef.current = null;
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: activeItem.fileName || 'Shared media',
                    url: activeItem.filePath,
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Share failed:', err);
                }
            }
            return;
        }

        await navigator.clipboard?.writeText(activeItem.filePath);
        alert('Media link copied.');
    };

    return (
        <div className="media-viewer-backdrop" onMouseDown={onClose}>
            <div
                className="media-viewer-shell"
                onMouseDown={(event) => event.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="media-viewer-toolbar">
                    <button className="viewer-icon-btn" type="button" onClick={onClose} aria-label="Close preview">
                        <i className="fas fa-times"></i>
                    </button>
                    <span className="media-counter">{activeIndex + 1}/{items.length}</span>
                    <div className="viewer-actions">
                        <a className="viewer-icon-btn" href={activeItem.filePath} download target="_blank" rel="noopener noreferrer" aria-label="Download media">
                            <i className="fas fa-download"></i>
                        </a>
                        <button className="viewer-icon-btn" type="button" onClick={handleShare} aria-label="Share media">
                            <i className="fas fa-share-alt"></i>
                        </button>
                        {canDelete && (
                            <button className="viewer-icon-btn danger" type="button" onClick={() => onDelete(media.messageId)} aria-label="Delete media">
                                <i className="fas fa-trash-alt"></i>
                            </button>
                        )}
                    </div>
                </div>

                {canNavigate && (
                    <>
                        <button className="viewer-nav prev" type="button" onClick={() => move(-1)} aria-label="Previous image">
                            <i className="fas fa-chevron-left"></i>
                        </button>
                        <button className="viewer-nav next" type="button" onClick={() => move(1)} aria-label="Next image">
                            <i className="fas fa-chevron-right"></i>
                        </button>
                    </>
                )}

                <div className="media-viewer-stage">
                    {isImage(activeItem.fileType) && (
                        <img
                            src={activeItem.filePath}
                            alt={activeItem.fileName || 'Full screen media'}
                            className={`media-item-img ${zoomed ? 'zoomed' : ''}`}
                            style={{ transform: `scale(${pinchScale > 1 ? pinchScale : zoomed ? 1.7 : 1})` }}
                            onDoubleClick={() => {
                                setPinchScale(1);
                                setZoomed(prev => !prev);
                            }}
                        />
                    )}
                    {isVideo(activeItem.fileType) && (
                        <video src={activeItem.filePath} controls autoPlay className="media-item-video" />
                    )}
                    {isAudio(activeItem.fileType) && (
                        <div className="audio-preview-card">
                            <i className="fas fa-microphone"></i>
                            <audio src={activeItem.filePath} controls autoPlay />
                        </div>
                    )}
                    {isPdf(activeItem) && (
                        <div className="pdf-viewer-card">
                            <iframe
                                title={activeItem.fileName || 'PDF preview'}
                                src={activeItem.filePath}
                                loading="lazy"
                            />
                            <a href={activeItem.filePath} target="_blank" rel="noopener noreferrer">
                                Open or download PDF
                            </a>
                        </div>
                    )}
                    {!isImage(activeItem.fileType) && !isVideo(activeItem.fileType) && !isAudio(activeItem.fileType) && !isPdf(activeItem) && (
                        <div className="unsupported-file">
                            <i className="fas fa-file-alt"></i>
                            <p>File preview not available.</p>
                            <a href={activeItem.filePath} target="_blank" rel="noopener noreferrer">Download File</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MediaViewer;
