import React from 'react';
import '../Styles/MediaViewer.css'; // This will be your new CSS file

const MediaViewer = ({ media, onClose }) => {
    if (!media) {
        return null; // Don't render if no media is selected
    }

    const { filePath, fileType } = media;

    return (
        <div className="media-viewer-backdrop" onClick={onClose}>
            <div className="media-viewer-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>&times;</button>
                {fileType === 'image' ? (
                    <img src={filePath} alt="Full screen media" className="media-item-img" />
                ) : fileType === 'video' ? (
                    <video src={filePath} controls autoPlay className="media-item-video" />
                ) : (
                    <div className="unsupported-file">
                        <i className="fas fa-file-alt fa-5x mb-3"></i>
                        <p>File preview not available.</p>
                        <a href={filePath} target="_blank" rel="noopener noreferrer" >Download File</a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MediaViewer;