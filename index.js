async function translateProviderSTV(text) {
    try {
        const response = await fetch('https://comic.sangtacvietcdn.xyz/tsm.php?cdn=/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `sajax=trans&content=${encodeURIComponent(text)}`
        });

        if (!response.ok) {
            throw new Error(response.statusText);
        }

        let result = await response.text();
        return cleanSTVTranslation(result);
    } catch (error) {
        console.error('STV translation error:', error);
        throw error;
    }
}

function cleanSTVTranslation(text) {
    return text.replace(/<\/?q>/g, '').trim();
}

// Lắng nghe sự kiện để dịch tin nhắn
eventSource.makeFirst(event_types.USER_MESSAGE_RENDERED, async (messageId) => {
    const message = getMessageById(messageId);
    if (message) {
        const translatedText = await translateProviderSTV(message.text);
        message.translatedText = translatedText; // Lưu kết quả dịch
        updateMessageBlock(messageId, message);
    }
});

// Khởi tạo extension
jQuery(() => {
    console.log('STV Extension loaded');
});