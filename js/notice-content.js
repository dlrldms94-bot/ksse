(function () {
  const KSSE = (window.KSSE = window.KSSE || {});

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  KSSE.parseYoutubeId = function (input) {
    if (!input) return '';
    const s = String(input).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    try {
      const url = new URL(s);
      if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0];
      if (url.hostname.includes('youtube.com')) {
        if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2];
        return url.searchParams.get('v') || '';
      }
    } catch {
      return '';
    }
    return '';
  };

  KSSE.getNoticeBlocks = function (notice) {
    if (!notice) return [];
    if (Array.isArray(notice.blocks) && notice.blocks.length) return notice.blocks;
    if (notice.content) return [{ type: 'text', body: notice.content }];
    return [];
  };

  KSSE.renderNoticeBlocks = function (notice) {
    return KSSE.getNoticeBlocks(notice)
      .map((block) => {
        if (block.type === 'text') {
          const body = escapeHtml(block.body || '').replace(/\n/g, '<br>');
          return `<div class="notice-block notice-block-text">${body}</div>`;
        }
        if (block.type === 'image' && block.dataUrl) {
          return `<figure class="notice-block notice-block-image"><img src="${block.dataUrl}" alt="${escapeHtml(block.name || '첨부 이미지')}"></figure>`;
        }
        if (block.type === 'file' && block.dataUrl) {
          return `<p class="notice-block notice-block-file"><a class="notice-file-link" href="${block.dataUrl}" download="${escapeHtml(block.name || 'download')}">${escapeHtml(block.name || '첨부 파일')}</a></p>`;
        }
        if (block.type === 'youtube') {
          const videoId = block.videoId || KSSE.parseYoutubeId(block.url);
          if (!videoId) return '';
          return `<div class="notice-block notice-block-youtube"><iframe src="https://www.youtube.com/embed/${escapeHtml(videoId)}" title="YouTube 동영상" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
        }
        return '';
      })
      .join('');
  };
})();
