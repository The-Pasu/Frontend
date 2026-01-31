// Universal Message Extractor (Instagram, Telegram, Danggeun)

(function() {
    if (!document.body) {
        setTimeout(() => {
            const script = document.createElement('script');
            script.textContent = document.currentScript?.textContent || '';
            (document.head || document.documentElement).appendChild(script);
        }, 100);
        return;
    }

    const hostname = window.location.hostname;
    let platform = null;
    
    if (hostname.includes('instagram.com')) {
        platform = 'instagram';
    } else if (hostname.includes('web.telegram.org')) {
        platform = 'telegram';
    } else if (hostname.includes('danggeun.com') || hostname.includes('당근')) {
        platform = 'danggeun';
    }

    if (!platform) {
        console.error('[Extractor] Unsupported platform:', hostname);
        return;
    }

    console.log(`[Extractor] Detected: ${platform}`);

    const statusBox = document.createElement('div');
    statusBox.style.position = 'fixed';
    statusBox.style.bottom = '20px';
    statusBox.style.right = '20px';
    statusBox.style.background = 'rgba(0, 0, 0, 0.8)';
    statusBox.style.color = '#fff';
    statusBox.style.padding = '10px 15px';
    statusBox.style.borderRadius = '8px';
    statusBox.style.zIndex = '99999';
    statusBox.style.fontSize = '14px';
    statusBox.innerText = `🔴 ${platform} scanner`;
    document.body.appendChild(statusBox);

    window.COLLECTED_DB = new Map();
    window.PROCESSED_CONTENTS = new Set();
    
    let lastTablePrint = 0;
    let messageCounter = 0;
    let recipientUsername = null;
    let myUsername = null;
    
    const today = new Date();
    let lastKnownDate = {
        year: today.getFullYear().toString(),
        month: String(today.getMonth() + 1).padStart(2, '0'),
        day: String(today.getDate()).padStart(2, '0')
    };

    // Platform-specific selectors
    const PLATFORM_CONFIG = {
        instagram: {
            chatContainer: '[role="grid"]',
            textNodes: 'div[dir="auto"], span[dir="auto"]',
            images: 'img'
        },
        telegram: {
            chatContainer: '.scrollable-y',
            textNodes: '.message-text, .text-content',
            images: 'img[class*="message"], img[class*="photo"]'
        },
        danggeun: {
            chatContainer: '.chat-messages, [class*="message-list"]',
            textNodes: '.message-text, .bubble-text',
            images: 'img[class*="message"], img[class*="bubble"]'
        }
    };

    const config = PLATFORM_CONFIG[platform];

    function parseTimeText(text) {
        if (platform === 'instagram') {
            const fullPattern = /(\d{2,4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{2})/;
            const timeOnlyPattern = /^(오전|오후)\s*(\d{1,2}):(\d{2})$/;
            
            const fullMatch = text.match(fullPattern);
            if (fullMatch) {
                let year = fullMatch[1];
                if (year.length === 2) year = `20${year}`;
                const month = fullMatch[2].padStart(2, '0');
                const day = fullMatch[3].padStart(2, '0');
                const meridiem = fullMatch[4];
                let hour = parseInt(fullMatch[5]);
                const minute = fullMatch[6];
                
                if (meridiem === '오후' && hour !== 12) hour += 12;
                else if (meridiem === '오전' && hour === 12) hour = 0;
                
                lastKnownDate = { year, month, day };
                
                return {
                    timestamp: new Date(`${year}-${month}-${day}T${hour.toString().padStart(2, '0')}:${minute}:00`).getTime(),
                    text: text
                };
            }
            
            const timeMatch = text.match(timeOnlyPattern);
            if (timeMatch && lastKnownDate) {
                const meridiem = timeMatch[1];
                let hour = parseInt(timeMatch[2]);
                const minute = timeMatch[3];
                
                if (meridiem === '오후' && hour !== 12) hour += 12;
                else if (meridiem === '오전' && hour === 12) hour = 0;
                
                const { year, month, day } = lastKnownDate;
                
                return {
                    timestamp: new Date(`${year}-${month}-${day}T${hour.toString().padStart(2, '0')}:${minute}:00`).getTime(),
                    text: `${year.slice(2)}. ${month}. ${day}. ${text}`
                };
            }
        }
        
        return null;
    }

    function shouldFilterOut(text) {
        if (!text || !text.trim()) return true;
        const trimmed = text.trim();
        
        if (platform === 'instagram') {
            if (recipientUsername && trimmed === recipientUsername) return true;
            if (myUsername && trimmed === myUsername) return true;
            if (/^\([월화수목금토일]\)\s*(오전|오후)\s*\d{1,2}:\d{2}$/.test(trimmed)) return true;
            
            const filters = [
                '님의 스토리에 답장을 보냈습니다',
                '스토리를 볼 수 없습니다',
                '회원님이 자신에게 보낸 답장',
                '님의 스토리에 공감했습니다',
                '님이 회원님에게 보낸 답장',
                '스토리에 답장',
                '스토리에 공감',
                '회원님',
                '자신에게',
                '공감했습니다',
                '답장을 보냈습니다',
                '릴스',
                '릴',
                'Reels',
                'reel',
                'shared a reel',
                'shared a video',
                '영상을 공유했습니다',
                '동영상',
                '이용할 수 없는 메시지',
                '이 콘텐츠는 콘텐츠 소유자가 삭제했거나 공개 범위 설정에 의해 숨겨졌을 수 있습니다'
            ];
            
            if (filters.some(filter => trimmed.includes(filter))) return true;
            if (/^(오전|오후)\s*\d{1,2}:\d{2}$/.test(trimmed)) return true;
            if (/^\d{2,4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*(오전|오후)\s*\d{1,2}:\d{2}$/.test(trimmed)) return true;
        }
        
        if (trimmed.length === 1) return true;
        return false;
    }

    function identifySpeaker(element) {
        if (platform === 'telegram') {
            let current = element;
            let depth = 0;
            while (current && depth < 10) {
                if (current.classList && (current.classList.contains('message') || current.classList.contains('is-out'))) {
                    return current.classList.contains('is-out') ? "나 (Me)" : "상대방 (Other)";
                }
                current = current.parentElement;
                depth++;
            }
        }
        
        if (platform === 'danggeun') {
            let current = element;
            let depth = 0;
            while (current && depth < 10) {
                const className = current.className || '';
                if (className.includes('my-message') || className.includes('me')) return "나 (Me)";
                if (className.includes('other-message') || className.includes('other')) return "상대방 (Other)";
                current = current.parentElement;
                depth++;
            }
        }
        
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const elementCenterX = rect.left + (rect.width / 2);
        
        if (rect.left > viewportWidth * 0.6) return "나 (Me)";
        if (rect.left + rect.width < viewportWidth * 0.4) return "상대방 (Other)";
        if (elementCenterX > viewportWidth / 2) return "나 (Me)";
        
        if (element.parentElement) {
            const siblings = Array.from(element.parentElement.children);
            const rightCount = siblings.filter(sib => {
                const sibRect = sib.getBoundingClientRect();
                return sibRect.left + sibRect.width / 2 > viewportWidth / 2;
            }).length;
            
            if (rightCount > siblings.length * 0.6 && elementCenterX > viewportWidth * 0.4) {
                return "나 (Me)";
            }
            if (rightCount < siblings.length * 0.4 && elementCenterX < viewportWidth * 0.6) {
                return "상대방 (Other)";
            }
        }
        
        return elementCenterX > viewportWidth / 2 ? "나 (Me)" : "상대방 (Other)";
    }

    function isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        const isVerticalInViewport = rect.top < window.innerHeight && rect.bottom > 0;
        const isHorizontalInViewport = rect.left < window.innerWidth && rect.right > 0;
        const hasMinHeight = rect.height > 5;
        const hasMinWidth = rect.width > 5;
        
        return isVerticalInViewport && isHorizontalInViewport && hasMinHeight && hasMinWidth;
    }

    function findNearestTime(element) {
        let current = element;
        let attempts = 0;
        
        while (current && attempts < 20) {
            const allTexts = current.querySelectorAll('div, span, time');
            for (const node of allTexts) {
                const text = node.innerText?.trim() || node.textContent?.trim();
                if (text) {
                    const timeInfo = parseTimeText(text);
                    if (timeInfo) return timeInfo;
                }
            }
            
            if (current.previousElementSibling) {
                const prevText = current.previousElementSibling.innerText?.trim() || 
                               current.previousElementSibling.textContent?.trim();
                if (prevText) {
                    const timeInfo = parseTimeText(prevText);
                    if (timeInfo) return timeInfo;
                }
            }
            
            current = current.parentElement;
            attempts++;
        }
        
        current = element;
        attempts = 0;
        while (current && attempts < 20) {
            if (current.nextElementSibling) {
                const nextText = current.nextElementSibling.innerText?.trim() || 
                               current.nextElementSibling.textContent?.trim();
                if (nextText) {
                    const timeInfo = parseTimeText(nextText);
                    if (timeInfo) return timeInfo;
                }
            }
            
            current = current.parentElement;
            attempts++;
        }
        
        return null;
    }

    function extractUsername() {
        if (platform === 'instagram' && !recipientUsername) {
            const selectors = [
                'header [role="heading"]', 'header h2', 'header h1', 'header span',
                '[role="navigation"] + div h1', '[role="banner"] h1'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.innerText?.trim() || el.textContent?.trim();
                    if (text && text.length > 0 && text.length < 50) {
                        const systemWords = ['메시지', '검색', '설정', '새 메시지', '받은 메시지함'];
                        if (!systemWords.some(word => text.includes(word))) {
                            recipientUsername = text;
                            break;
                        }
                    }
                }
                if (recipientUsername) break;
            }
        }
        
        if (platform === 'instagram' && !myUsername) {
            const profileLinks = document.querySelectorAll('a[href*="/"]');
            for (const link of profileLinks) {
                const href = link.getAttribute('href');
                if (href && href.startsWith('/') && !href.includes('explore') && !href.includes('direct')) {
                    const username = href.replace('/', '').trim();
                    if (username && username.length > 0 && username.length < 30) {
                        myUsername = username;
                        break;
                    }
                }
            }
        }
    }

    function scanScreen() {
        try {
            extractUsername();
            
            const chatContainer = document.querySelector(config.chatContainer) || document.body;
            const textNodes = chatContainer.querySelectorAll(config.textNodes);
            
            textNodes.forEach(node => {
                const text = node.innerText?.trim() || node.textContent?.trim();
                if (!text || !isElementInViewport(node)) return;
                if (shouldFilterOut(text)) return;

                const normalized = text.trim().replace(/\s+/g, ' ').normalize('NFC');
                const contentKey = `TEXT_${normalized}`;
                
                if (window.PROCESSED_CONTENTS.has(contentKey)) return;

                const timeInfo = findNearestTime(node);
                const counter = messageCounter++;
                
                window.COLLECTED_DB.set(contentKey, {
                    id: `msg_${counter}`,
                    type: 'text',
                    sender: identifySpeaker(node),
                    content: text,
                    timestamp: timeInfo?.timestamp || null,
                    timestampText: timeInfo?.text || null,
                    sequence: counter,
                    collectedAt: Date.now()
                });
                
                window.PROCESSED_CONTENTS.add(contentKey);
            });

            const images = chatContainer.querySelectorAll(config.images);
            images.forEach(img => {
                const rect = img.getBoundingClientRect();
                if (!isElementInViewport(img)) return;
                if (rect.width < 50 || rect.height < 50) return;
                
                let src = img.src;
                if (img.srcset) {
                    const parts = img.srcset.split(',');
                    src = parts[parts.length - 1].trim().split(' ')[0];
                }
                
                const contentKey = `IMG_${src}`;
                if (window.PROCESSED_CONTENTS.has(contentKey)) return;

                const timeInfo = findNearestTime(img);
                const counter = messageCounter++;
                
                window.COLLECTED_DB.set(contentKey, {
                    id: `msg_${counter}`,
                    type: 'image',
                    sender: identifySpeaker(img),
                    content: src,
                    timestamp: timeInfo?.timestamp || null,
                    timestampText: timeInfo?.text || null,
                    sequence: counter,
                    collectedAt: Date.now()
                });
                
                window.PROCESSED_CONTENTS.add(contentKey);
            });

            statusBox.innerText = `📥 ${window.COLLECTED_DB.size} messages`;
            
            const now = Date.now();
            if (now - lastTablePrint > 3000) {
                lastTablePrint = now;
                const data = Array.from(window.COLLECTED_DB.values());
                if (data.length > 0) {
                    console.table(data);
                }
            }
        } catch (error) {
            console.error('[Scan Error]', error);
        }
    }

    const scannerInterval = setInterval(scanScreen, 500);

    window.showData = function() {
        let data = Array.from(window.COLLECTED_DB.values());
        
        data.sort((a, b) => {
            if (a.timestamp && b.timestamp) {
                if (a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
                return b.sequence - a.sequence;
            }
            if (a.timestamp) return -1;
            if (b.timestamp) return 1;
            return b.sequence - a.sequence;
        });
        
        console.log(`[Collected] ${data.length} messages`);
        if (data.length > 0) {
            console.table(data);
        } else {
            console.log('[Data] No messages collected yet');
        }
        return data;
    };

    window.stopAndExport = function() {
        clearInterval(scannerInterval);
        statusBox.style.backgroundColor = '#2ecc71';
        
        let data = Array.from(window.COLLECTED_DB.values());
        
        data.sort((a, b) => {
            if (a.timestamp && b.timestamp) {
                if (a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
                return b.sequence - a.sequence;
            }
            if (a.timestamp) return -1;
            if (b.timestamp) return 1;
            return b.sequence - a.sequence;
        });
        
        const stats = {
            total: data.length,
            myMessages: data.filter(m => m.sender === '나 (Me)').length,
            otherMessages: data.filter(m => m.sender === '상대방 (Other)').length,
            textMessages: data.filter(m => m.type === 'text').length,
            imageMessages: data.filter(m => m.type === 'image').length,
            withTimestamp: data.filter(m => m.timestamp).length,
            withoutTimestamp: data.filter(m => !m.timestamp).length
        };

        statusBox.innerText = `✅ Done! (${data.length} messages)`;

        console.log('\n=== Collection Complete ===\n');
        if (recipientUsername) console.log(`Recipient: ${recipientUsername}`);
        if (myUsername) console.log(`Me: ${myUsername}`);
        
        console.log('\nStatistics:');
        console.log(`Total: ${stats.total}`);
        console.log(`My messages: ${stats.myMessages} (${(stats.myMessages/stats.total*100).toFixed(1)}%)`);
        console.log(`Other messages: ${stats.otherMessages} (${(stats.otherMessages/stats.total*100).toFixed(1)}%)`);
        console.log(`Text: ${stats.textMessages}`);
        console.log(`Images: ${stats.imageMessages}`);
        console.log(`With timestamp: ${stats.withTimestamp}`);
        console.log(`Without timestamp: ${stats.withoutTimestamp}`);
        console.log('\nAll Messages (Latest First):');
        console.table(data);
        
        return data;
    };

})();
