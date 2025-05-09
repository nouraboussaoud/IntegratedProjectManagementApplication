// Dans votre fichier socketServer.js ou équivalent
module.exports = function setupVideoCallHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`Video call handler connected for user ${socket.userId}`);

        // Quand un utilisateur rejoint un appel
        socket.on('join-call-room', (roomName) => {
            if (!roomName) return;
            
            console.log(`${socket.userId} joining call room: ${roomName}`);
            socket.join(roomName);
            
            // Notifier les autres participants
            socket.to(roomName).emit('user-joined-call', {
                userId: socket.userId,
                roomName,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('leave-call-room', (roomName) => {
            if (!roomName) return;
            
            console.log(`${socket.userId} leaving call room: call-${roomName}`);
            socket.leave(`call-${roomName}`);
        });

        // Gérer les réponses aux appels vidéo
        socket.on('video-call-response', async (data) => {
            try {
                const { response, roomName, projectId, from } = data;
                
                // Diffuser la réponse à tous les membres du groupe
                emitToGroup(projectId, 'video-call-response', {
                    from: socket.userId,
                    response,
                    roomName,
                    timestamp: new Date()
                });

                // Si la réponse est 'accept', notifier l'initiateur
                if (response === 'accept') {
                    io.to(from).emit('video-call-accepted', {
                        roomName,
                        participantId: socket.userId
                    });
                }
            } catch (error) {
                console.error('Error handling video call response:', error);
            }
        });

        // Gérer la fin d'appel
        socket.on('end-video-call', (data) => {
            emitToGroup(data.projectId, 'video-call-ended', {
                from: socket.userId,
                roomName: data.roomName
            });
        });
    });
};