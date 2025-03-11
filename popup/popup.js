document.addEventListener('DOMContentLoaded', function() {
    // 获取代理配置列表
    loadProxyConfigs();
    
    // 绑定管理代理按钮事件
    document.getElementById('manageProxiesBtn').addEventListener('click', function() {
      chrome.runtime.openOptionsPage();
    });
    
    // 绑定作者链接事件
    document.getElementById('authorLink').addEventListener('click', function(e) {
      e.preventDefault();
      // 这里可以添加作者信息或链接
      chrome.tabs.create({ url: 'https://github.com/kxcode' });
    });
  });
  
  // 加载代理配置
  function loadProxyConfigs() {
    chrome.runtime.sendMessage({ action: 'getProxyConfigs' }, function(response) {
      const proxyListElement = document.querySelector('.proxy-list');
      proxyListElement.innerHTML = '';
      
      const proxyConfigs = response.proxyConfigs || {};
      const activeProxy = response.activeProxy || 'direct';
      
      // 首先添加直接连接选项
      if (proxyConfigs.direct) {
        addProxyItemToList(proxyConfigs.direct, 'direct', activeProxy === 'direct', proxyListElement);
      } else {
        // 如果没有直接连接选项，添加一个默认的
        const directConfig = {
          name: '直接连接',
          type: 'direct'
        };
        addProxyItemToList(directConfig, 'direct', activeProxy === 'direct', proxyListElement);
      }
      
      // 添加其他代理配置
      let hasOtherConfigs = false;
      for (const proxyId in proxyConfigs) {
        if (proxyId !== 'direct') {
          hasOtherConfigs = true;
          const config = proxyConfigs[proxyId];
          addProxyItemToList(config, proxyId, activeProxy === proxyId, proxyListElement);
        }
      }
      
      // 如果没有其他配置，显示提示
      if (!hasOtherConfigs) {
        const noConfigsMsg = document.createElement('div');
        noConfigsMsg.className = 'no-proxies';
        noConfigsMsg.innerHTML = `
          <p>没有可用的代理配置。</p><span id="addNewProxyBtn" style="text-decoration: underline; cursor: pointer;">添加代理</span>
        `;
        proxyListElement.appendChild(noConfigsMsg);
        
        // 绑定添加代理按钮事件
        document.getElementById('addNewProxyBtn').addEventListener('click', function() {
          chrome.runtime.openOptionsPage();
        });
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
        return '<span>🔌</span>';
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
        loadProxyConfigs();
      }
    });
  } 