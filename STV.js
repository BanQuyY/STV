// ==UserScript==
// @name    STV Web Translator for ducninh.io.vn
// @namespace    http://tampermonkey.net/
// @version    1.4
// @description  Dịch trang web sử dụng API của STV, đặc biệt tối ưu cho ducninh.io.vn
// @author    You
// @match    http://ducninh.io.vn:8000/*
// @match    http://ducninh.io.vn/*
// @match    http://localhost:8000/*
// @match    http://127.0.0.1:8000/*
// @grant    GM_xmlhttpRequest
// @grant    GM_addStyle
// @connect    comic.sangtacvietcdn.xyz
// @run-at    document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Xóa nút dịch nổi và các tùy chọn không cần thiết
    GM_addStyle(`
    .translate-button, .translate-options {
    display: none !important;
    }
    `);

    // Kiểm tra và đợi cho DOM tải xong
    function waitForDOM() {
    return new Promise(resolve => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(resolve, 500);
    } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(resolve, 500));
    }
    });
    }

    // Hàm dịch văn bản bằng STV
    async function translateWithSTV(text) {
    if (!text || text.trim() === '') return '';

    return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
    method: 'POST',
    url: 'https://comic.sangtacvietcdn.xyz/tsm.php?cdn=/',
    headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: `sajax=trans&content=${encodeURIComponent(text)}`,
    onload: function(response) {
    if (response.status === 200) {
    resolve(cleanSTVTranslation(response.responseText));
    } else {
    reject('Lỗi khi dịch: ' + response.statusText);
    }
    },
    onerror: function(error) {
    reject('Lỗi kết nối: ' + error);
    }
    });
    });
    }

    // Hàm làm sạch kết quả dịch từ STV
    function cleanSTVTranslation(text) {
    return text
    .replace(/"([^"]*?)"\s+\*/g, '"$1"*')
    .replace(/\*\s+"([^"]*?)"/g, '*"$1"')
    .replace(/([^\s])\s+\*/g, '$1*')
    .replace(/\*\s+([^\s])/g, '*$1')
    .replace(/<\/?q>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
    }

    // Hàm dịch phần mes_text trong một mes_block
    async function translateMessageText(mesBlock) {
        const mesText = mesBlock.querySelector('.mes_text');
        if (!mesText) return;

        // Lưu nội dung gốc nếu chưa có
        if (!mesText.dataset.originalContent) {
            mesText.dataset.originalContent = mesText.innerHTML;
        }

        try {
            // Tìm tất cả các iframe trong mes_text
            const iframes = mesText.querySelectorAll('iframe');

            for (const iframe of iframes) {
                try {
                    // Đảm bảo iframe đã load xong
                    if (iframe.contentDocument) {
                        // Tìm .chat-messages trong iframe
                        const chatMessages = iframe.contentDocument.querySelector('.chat-messages');

                        if (chatMessages) {
                            // Dịch tất cả các message-content trong chat-messages
                            const messageContents = chatMessages.querySelectorAll('.message-content');

                            for (const content of messageContents) {
                                // Bỏ qua nếu là hình ảnh
                                if (content.querySelector('img')) continue;

                                // Lưu nội dung gốc nếu chưa có
                                if (!content.dataset.originalContent) {
                                    content.dataset.originalContent = content.textContent;
                                }

                                const originalText = content.dataset.originalContent;
                                const translatedText = await translateWithSTV(originalText);
                                content.textContent = translatedText;
                            }

                            // Dịch các phần tử details trong chat-messages (như trạng thái nhân vật)
                            const detailsElements = chatMessages.querySelectorAll('details');

                            for (const details of detailsElements) {
                                // Dịch summary (tiêu đề)
                                const summary = details.querySelector('summary');
                                if (summary) {
                                    if (!summary.dataset.originalContent) {
                                        summary.dataset.originalContent = summary.textContent;
                                    }

                                    const originalSummary = summary.dataset.originalContent;
                                    const translatedSummary = await translateWithSTV(originalSummary);
                                    summary.textContent = translatedSummary;
                                }

                                // Dịch nội dung bên trong details
                                const detailsContent = details.querySelector('details > div');
                                if (detailsContent) {
                                    // Lưu HTML gốc
                                    if (!detailsContent.dataset.originalContent) {
                                        detailsContent.dataset.originalContent = detailsContent.innerHTML;
                                    }

                                    // Dịch tất cả các phần tử văn bản trong details
                                    const textElements = detailsContent.querySelectorAll('span, h2, div.preview-title, div.preview-description, div.caller-name, div.call-status');

                                    for (const element of textElements) {
                                        // Bỏ qua các phần tử rỗng hoặc chỉ chứa emoji
                                        if (!element.textContent.trim() || element.textContent.match(/^[\p{Emoji}\s]+$/u)) continue;

                                        // Lưu nội dung gốc
                                        if (!element.dataset.originalContent) {
                                            element.dataset.originalContent = element.textContent;
                                        }

                                        const originalText = element.dataset.originalContent;
                                        const translatedText = await translateWithSTV(originalText);
                                        element.textContent = translatedText;
                                    }
                                }
                            }

                            console.log('Đã dịch nội dung chat thành công');
                        }
                    }
                } catch (error) {
                    console.error('Lỗi khi truy cập iframe:', error);
                }
            }
        } catch (error) {
            console.error('Lỗi khi dịch:', error);
        }
    }

    // Cải tiến: Thêm event listener thay vì thay thế nút
    function setupTranslateButtons() {
    document.addEventListener('click', function(event) {
    // Kiểm tra xem phần tử được click có class mes_translate không
    if (event.target.classList.contains('mes_translate') ||
    event.target.closest('.mes_translate')) {

    event.preventDefault();
    event.stopPropagation();

    // Tìm mes_block cha
    const button = event.target.classList.contains('mes_translate') ?
    event.target : event.target.closest('.mes_translate');
    const mesBlock = button.closest('.mes_block');

    if (mesBlock) {
    translateMessageText(mesBlock);
    }
    }
    }, true); // Sử dụng capturing để bắt sự kiện trước khi nó đến target
    }

    // Thêm phím tắt Alt+T để dịch tin nhắn hiện tại
    function addKeyboardShortcut() {
    document.addEventListener('keydown', function(e) {
    if (e.altKey && e.key === 't') {
    // Tìm tin nhắn đang được focus hoặc tin nhắn cuối cùng
    const focusedMessage = document.activeElement.closest('.mes_block');
    if (focusedMessage) {
    translateMessageText(focusedMessage);
    } else {
    // Nếu không có tin nhắn nào được focus, dịch tin nhắn cuối cùng
    const lastMessage = document.querySelector('.mes_block:last-child');
    if (lastMessage) {
    translateMessageText(lastMessage);
    }
    }
    }
    });
    }

    // Hàm khởi tạo
    async function init() {
    await waitForDOM();
    setupTranslateButtons();
    addKeyboardShortcut();
    console.log('STV Web Translator đã được khởi tạo thành công!');
    }

    // Khởi chạy script
    init();
})();