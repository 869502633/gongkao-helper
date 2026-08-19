// Service Worker - 考公备考工作台
const CACHE_NAME = 'gongkao-dashboard-v1';
const OFFLINE_URL = 'index.html';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './assets/echarts.min.js'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch(() => {
          // 部分资源可能加载失败，不影响安装
          return cache.add(OFFLINE_URL);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求：缓存优先，网络回退
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // 只缓存 GET 请求
  if (request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // 有缓存，同时后台更新
          event.waitUntil(updateCache(request));
          return cachedResponse;
        }
        
        // 无缓存，从网络获取
        return fetch(request)
          .then((response) => {
            // 缓存新的响应
            if (response && response.status === 200 && response.type === 'basic') {
              event.waitUntil(saveToCache(request, response.clone()));
            }
            return response;
          })
          .catch(() => {
            // 网络失败，显示离线页面
            return caches.match(OFFLINE_URL);
          });
      })
  );
});

function saveToCache(request, response) {
  return caches.open(CACHE_NAME).then((cache) => {
    return cache.put(request, response);
  });
}

function updateCache(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        return saveToCache(request, response);
      }
    })
    .catch(() => {
      // 更新失败不影响使用
    });
}
