// 代理配置管理和应用
let currentProxyConfig = null;

// 初始化
chrome.runtime.onInstalled.addListener(() => {
  // 设置默认配置
  chrome.storage.local.get(['proxyConfigs', 'activeProxy'], (result) => {
    if (!result.proxyConfigs) {
      const defaultConfigs = {
        'direct': {
          name: '直接连接',
          type: 'direct',
          active: true
        }
      };
      
      chrome.storage.local.set({
        proxyConfigs: defaultConfigs,
        activeProxy: 'direct'
      });
    }
    
    // 应用当前活动的代理配置
    applyActiveProxyConfig();
  });
});

// 监听来自弹出窗口和选项页面的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('收到消息:', request.action, request);
  
  try {
    switch (request.action) {
      case 'getProxyConfigs':
        // 获取代理配置
        chrome.storage.local.get(['proxyConfigs', 'activeProxy'], function(data) {
          console.log('获取代理配置完成，准备发送响应');
          sendResponse({
            proxyConfigs: data.proxyConfigs || {},
            activeProxy: data.activeProxy || 'direct'
          });
        });
        break;
        
      case 'setActiveProxy':
        // 设置活动代理
        console.log('设置活动代理:', request.proxyId);
        setActiveProxy(request.proxyId, function(success) {
          console.log('设置活动代理完成，准备发送响应');
          sendResponse({ success: success });
        });
        break;
        
      case 'addProxyConfig':
        // 添加代理配置
        console.log('添加代理配置:', request.config);
        addProxyConfig(request.config, function(success, proxyId, error) {
          console.log('添加代理配置完成，准备发送响应');
          sendResponse({ 
            success: success, 
            proxyId: proxyId,
            error: error
          });
        });
        break;
        
      case 'updateProxyConfig':
        // 更新代理配置
        console.log('更新代理配置:', request.proxyId, request.config);
        updateProxyConfig(request.proxyId, request.config, function(success, error) {
          console.log('更新代理配置完成，准备发送响应');
          sendResponse({ 
            success: success,
            error: error
          });
        });
        break;
        
      case 'deleteProxyConfig':
        // 删除代理配置
        console.log('删除代理配置:', request.proxyId);
        deleteProxyConfig(request.proxyId, function(success, error) {
          console.log('删除代理配置完成，准备发送响应');
          sendResponse({ 
            success: success,
            error: error
          });
        });
        break;
        
      case 'importConfigs':
        // 导入配置
        console.log('导入配置');
        importConfigs(request.configs, function(success) {
          console.log('导入配置完成，准备发送响应');
          sendResponse({ success: success });
        });
        break;
        
      case 'exportConfigs':
        // 导出配置
        console.log('导出配置');
        chrome.storage.local.get('proxyConfigs', function(data) {
          console.log('导出配置完成，准备发送响应');
          sendResponse({
            success: true,
            configs: data.proxyConfigs || {}
          });
        });
        break;
        
      default:
        console.log('未知操作:', request.action);
        sendResponse({ success: false, error: '未知操作' });
        break;
    }
  } catch (error) {
    console.error('处理消息时出错:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  // 返回 true 表示将异步发送响应
  return true;
});

// 应用当前活动的代理配置
function applyActiveProxyConfig() {
  chrome.storage.local.get(['proxyConfigs', 'activeProxy'], (result) => {
    const activeProxyId = result.activeProxy || 'direct';
    const proxyConfigs = result.proxyConfigs || {};
    const config = proxyConfigs[activeProxyId];
    
    if (!config) {
      clearProxySettings();
      return;
    }
    
    if (config.type === 'direct') {
      clearProxySettings();
    } else {
      setProxySettings(config);
    }
    
    // 更新图标状态
    updateIcon(config);
  });
}

// 清除代理设置
function clearProxySettings() {
  chrome.proxy.settings.clear({ scope: 'regular' }, () => {
    console.log('代理设置已清除');
  });
}

// 设置代理
function setProxySettings(config) {
  let proxyConfig = {
    mode: "fixed_servers",
    rules: {}
  };
  
  // 根据代理类型设置不同的配置
  if (config.type === 'http') {
    proxyConfig.rules.singleProxy = {
      scheme: "http",
      host: config.host,
      port: parseInt(config.port)
    };
  } else if (config.type === 'https') {
    proxyConfig.rules.singleProxy = {
      scheme: "https",
      host: config.host,
      port: parseInt(config.port)
    };
  } else if (config.type === 'socks5') {
    proxyConfig.rules.singleProxy = {
      scheme: "socks5",
      host: config.host,
      port: parseInt(config.port)
    };
  }
  
  // 如果有认证信息，添加认证
  if (config.auth && config.username && config.password) {
    chrome.webRequest.onAuthRequired.addListener(
      function(details, callbackFn) {
        callbackFn({
          authCredentials: {
            username: config.username,
            password: config.password
          }
        });
      },
      { urls: ["<all_urls>"] },
      ['blocking']
    );
  }
  
  // 应用代理设置
  chrome.proxy.settings.set(
    { value: proxyConfig, scope: 'regular' },
    () => {
      console.log('代理设置已应用:', config.name);
    }
  );
}

// 更新图标状态
function updateIcon(config) {
  // 根据代理类型更改图标颜色或徽章
  if (config.type === 'direct') {
    chrome.action.setBadgeText({ text: '' });
  } else {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#6bbd6e' });
  }
}

// 保存代理配置
function saveProxyConfig(config, sendResponse) {
  chrome.storage.local.get(['proxyConfigs'], (result) => {
    const proxyConfigs = result.proxyConfigs || {};
    
    // 生成唯一ID（如果是新配置）
    if (!config.id) {
      config.id = 'proxy_' + Date.now();
    }
    
    // 更新配置
    proxyConfigs[config.id] = config;
    
    chrome.storage.local.set({ proxyConfigs }, () => {
      sendResponse({ success: true, config });
    });
  });
}

// 删除代理配置
function deleteProxyConfig(proxyId, callback) {
  chrome.storage.local.get(['proxyConfigs', 'activeProxy'], function(result) {
    const proxyConfigs = result.proxyConfigs || {};
    const activeProxy = result.activeProxy;
    
    // 不允许删除当前活动的代理
    if (proxyId === activeProxy) {
      callback(false, '不能删除当前活动的代理配置');
      return;
    }
    
    // 不允许删除直接连接选项
    if (proxyId === 'direct') {
      callback(false, '不能删除直接连接选项');
      return;
    }
    
    // 删除配置
    delete proxyConfigs[proxyId];
    
    chrome.storage.local.set({ proxyConfigs: proxyConfigs }, function() {
      if (chrome.runtime.lastError) {
        console.error('删除代理配置时出错:', chrome.runtime.lastError);
        callback(false, chrome.runtime.lastError.message);
      } else {
        callback(true);
      }
    });
  });
}

// 导入配置
function importConfigs(configs, callback) {
  chrome.storage.local.get(['proxyConfigs'], function(result) {
    let proxyConfigs = result.proxyConfigs || {};
    
    // 合并配置
    proxyConfigs = { ...proxyConfigs, ...configs };
    
    chrome.storage.local.set({ proxyConfigs: proxyConfigs }, function() {
      if (chrome.runtime.lastError) {
        console.error('导入配置时出错:', chrome.runtime.lastError);
        callback(false);
      } else {
        callback(true);
      }
    });
  });
}

// 导出配置
function exportConfigs(sendResponse) {
  chrome.storage.local.get(['proxyConfigs'], (result) => {
    sendResponse({ success: true, configs: result.proxyConfigs || {} });
  });
}

// 添加代理配置
function addProxyConfig(config, callback) {
  console.log('开始添加代理配置:', config);
  chrome.storage.local.get('proxyConfigs', function(data) {
    console.log('获取到现有代理配置');
    const proxyConfigs = data.proxyConfigs || {};
    
    // 生成唯一ID
    const proxyId = 'proxy_' + Date.now();
    console.log('生成代理ID:', proxyId);
    
    // 添加新配置
    proxyConfigs[proxyId] = config;
    
    // 保存更新后的配置
    console.log('准备保存代理配置');
    chrome.storage.local.set({ proxyConfigs: proxyConfigs }, function() {
      console.log('代理配置已保存');
      if (chrome.runtime.lastError) {
        console.error('保存代理配置时出错:', chrome.runtime.lastError);
        callback(false, null, chrome.runtime.lastError.message);
      } else {
        console.log('成功保存代理配置，调用回调');
        callback(true, proxyId);
      }
    });
  });
}

// 更新代理配置
function updateProxyConfig(proxyId, config, callback) {
  console.log('开始更新代理配置:', proxyId, config);
  chrome.storage.local.get('proxyConfigs', function(data) {
    console.log('获取到现有代理配置');
    const proxyConfigs = data.proxyConfigs || {};
    
    // 检查代理ID是否存在
    if (!proxyConfigs[proxyId]) {
      console.error('代理配置不存在:', proxyId);
      callback(false, '代理配置不存在');
      return;
    }
    
    // 更新配置
    proxyConfigs[proxyId] = config;
    
    // 保存更新后的配置
    console.log('准备保存更新后的代理配置');
    chrome.storage.local.set({ proxyConfigs: proxyConfigs }, function() {
      console.log('代理配置已更新');
      if (chrome.runtime.lastError) {
        console.error('更新代理配置时出错:', chrome.runtime.lastError);
        callback(false, chrome.runtime.lastError.message);
      } else {
        console.log('成功更新代理配置，调用回调');
        callback(true);
      }
    });
  });
}

// 设置活动代理
function setActiveProxy(proxyId, callback) {
  chrome.storage.local.set({ activeProxy: proxyId }, function() {
    if (chrome.runtime.lastError) {
      console.error('设置活动代理时出错:', chrome.runtime.lastError);
      callback(false);
      return;
    }
    
    // 应用代理配置
    applyActiveProxyConfig();
    callback(true);
  });
} 