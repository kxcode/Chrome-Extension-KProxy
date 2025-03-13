document.addEventListener('DOMContentLoaded', function() {
  // 获取代理配置列表
  loadProxyList();
  
  // 绑定管理代理按钮事件
  document.getElementById('manageProxiesBtn').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });

});

// 加载代理配置
function loadProxyList() {
  chrome.runtime.sendMessage({ action: 'getProxyConfigs' }, function(response) {
    const proxyConfigs = response.proxyConfigs;
    const activeProxy = response.activeProxy;
    
    const proxyListElement = document.querySelector('.proxy-list');
    if (!proxyListElement) {
      console.error('找不到代理列表元素');
      return;
    }
    
    proxyListElement.innerHTML = '';
    
    // 添加直接连接选项
    if (proxyConfigs.direct) {
      addProxyItemToList(proxyConfigs.direct, 'direct', activeProxy === 'direct', proxyListElement);
    }
    
    // 添加自动切换规则
    for (const proxyId in proxyConfigs) {
      if (proxyId !== 'direct' && proxyConfigs[proxyId].type === 'auto') {
        const config = proxyConfigs[proxyId];
        addAutoProxyItemToList(config, proxyId, activeProxy === proxyId, proxyListElement);
      }
    }
    
    // 添加其他代理配置
    for (const proxyId in proxyConfigs) {
      if (proxyId !== 'direct' && proxyConfigs[proxyId].type !== 'auto') {
        const config = proxyConfigs[proxyId];
        addProxyItemToList(config, proxyId, activeProxy === proxyId, proxyListElement);
      }
    }
  });
}

// 添加代理项到列表
function addProxyItemToList(config, proxyId, isActive, listElement) {
  const proxyItem = document.createElement('div');
  proxyItem.className = `proxy-item ${isActive ? 'active' : ''}`;
  proxyItem.dataset.proxyId = proxyId;
  
  let iconHtml = '';
  let infoHtml = '';
  
  if (config.type === 'direct') {
    iconHtml = '<span>🔗</span>';
    infoHtml = '直接连接到互联网';
  } else {
    iconHtml = getProxyTypeIcon(config.type);
    infoHtml = `${config.type.toUpperCase()} - ${config.host}:${config.port}`;
    if (config.auth) {
      infoHtml += ' (需要认证)';
    }
  }
  
  proxyItem.innerHTML = `
    <div class="proxy-item-icon">${iconHtml}</div>
    <div class="proxy-item-details">
      <div class="proxy-name">${config.name}</div>
      <div class="proxy-info">${infoHtml}</div>
    </div>
  `;
  
  // 点击切换代理
  proxyItem.addEventListener('click', function() {
    setActiveProxy(proxyId);
  });
  
  listElement.appendChild(proxyItem);
}

// 添加自动代理项到列表
function addAutoProxyItemToList(config, proxyId, isActive, listElement) {
  const proxyItem = document.createElement('div');
  proxyItem.className = `proxy-item ${isActive ? 'active' : ''}`;
  proxyItem.dataset.proxyId = proxyId;
  
  proxyItem.innerHTML = `
    <div class="proxy-item-icon">🔌</div>
    <div class="proxy-item-details">
      <div class="proxy-name">${config.name}</div>
      <div class="proxy-info">自动切换规则</div>
    </div>
  `;
  
  // 点击切换代理
  proxyItem.addEventListener('click', function() {
    setActiveProxy(proxyId);
  });
  
  listElement.appendChild(proxyItem);
}

// 获取代理类型图标
function getProxyTypeIcon(type) {
  switch (type) {
    case 'http':
      return '<span>🌐</span>';
    case 'https':
      return '<span>🔒</span>';
    case 'socks5':
      return '<span>🧦</span>';
    default:
      return '<span>🌐</span>';
  }
}

// 设置活动代理
function setActiveProxy(proxyId) {
  chrome.runtime.sendMessage({ 
    action: 'setActiveProxy', 
    proxyId: proxyId 
  }, function(response) {
    if (response.success) {
      // 刷新列表以更新活动状态
      loadProxyList();
    }
  });
} 