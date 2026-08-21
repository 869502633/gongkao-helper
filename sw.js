// 考公助手 Service Worker
// 支持离线访问，像APP一样随时使用

const CACHE_NAME = 'gongkao-helper-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './yier.jpg',
  './bubu.jpg',
  './yier-happy.jpg',
  './yier-sad.jpg',
  './bear-coin.jpg'
];

// 安装：缓存核心资源
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function() {
        // 部分资源可能不存在，不阻止安装
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// 拦截请求：缓存优先策略
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      // 缓存命中，直接返回
      if (response) {
        // 同时更新缓存（后台静默更新）
        fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            var responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
        }).catch(function() {});
        return response;
      }
      // 缓存未命中，从网络获取
      return fetch(event.request).then(function(networkResponse) {
        // 缓存新资源
        if (networkResponse && networkResponse.status === 200) {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(function() {
        // 网络失败，返回离线页面
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('离线状态', { status: 503 });
      });
    })
  );
});
