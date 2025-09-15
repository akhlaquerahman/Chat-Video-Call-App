import React from 'react';

const CallNotification = ({ incomingCall, handleAnswerCall }) => {
    if (!incomingCall) {
        return null;
    }

    // Determine the call type
    const callType = incomingCall.callType || 'video'; // Default to video if not specified

    return (
        <div className="call-notification alert alert-info text-center">
            <p className="mb-0">Incoming {callType} call from {incomingCall.callerIdentity}...</p>
            <button className="btn btn-sm btn-success mt-2" onClick={() => handleAnswerCall(callType)}>Answer</button>
        </div>
    );
};

export default CallNotification;