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

  // 监听未捕获的错误
  self.addEventListener('error', function (event) {
    console.error('未捕获的错误:', event.message, event.filename, event.lineno);
  });

  // 监听未处理的 Promise 拒绝
  self.addEventListener('unhandledrejection', function (event) {
    console.error('未处理的 Promise 拒绝:', event.reason);
  });
});

// 监听来自弹出窗口和选项页面的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('收到消息:', request.action, request);

  try {
    const handlers = {
      getProxyConfigs: () => {
        chrome.storage.local.get(['proxyConfigs', 'activeProxy'], function (data) {
          console.log('获取代理配置完成，准备发送响应');
          sendResponse({
            proxyConfigs: data.proxyConfigs || {},
            activeProxy: data.activeProxy || 'direct'
          });
        });
      },

      setActiveProxy: () => {
        console.log('设置活动代理:', request.proxyId);
        setActiveProxy(request.proxyId, function (success) {
          console.log('设置活动代理完成，准备发送响应');
          sendResponse({ success: success });
        });
      },

      addProxyConfig: () => {
        console.log('添加代理配置:', request.config);
        addProxyConfig(request.config, function (success, proxyId, error) {
          console.log('添加代理配置完成，准备发送响应');
          sendResponse({ success, proxyId, error });
        });
      },

      updateProxyConfig: () => {
        console.log('更新代理配置:', request.proxyId, request.config);
        updateProxyConfig(request.proxyId, request.config, function (success, error) {
          console.log('更新代理配置完成，准备发送响应');
          sendResponse({ success, error });
        });
      },

      deleteProxyConfig: () => {
        console.log('删除代理配置:', request.proxyId);
        deleteProxyConfig(request.proxyId, function (success, error) {
          console.log('删除代理配置完成，准备发送响应');
          sendResponse({ success, error });
        });
      },

      importConfigs: () => {
        console.log('导入配置');
        importConfigs(request.configs, function (success) {
          console.log('导入配置完成，准备发送响应');
          sendResponse({ success });
        });
      },

      exportConfigs: () => {
        console.log('导出配置');
        chrome.storage.local.get('proxyConfigs', function (data) {
          console.log('导出配置完成，准备发送响应');
          sendResponse({
            success: true,
            configs: data.proxyConfigs || {}
          });
        });
      }
    };

    const handler = handlers[request.action];
    if (handler) {
      handler();
    } else {
      console.log('未知操作:', request.action);
      sendResponse({ success: false, error: '未知操作' });
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
  console.log('应用当前活动的代理配置');

  // 获取当前的代理设置，检查是否已经应用
  chrome.proxy.settings.get({}, function (config) {
    console.log('当前代理设置:', JSON.stringify(config));
  });

  chrome.storage.local.get(['proxyConfigs', 'activeProxy'], (result) => {
    const activeProxyId = result.activeProxy || 'direct';
    const proxyConfigs = result.proxyConfigs || {};
    const config = proxyConfigs[activeProxyId];

    console.log('当前活动代理:', activeProxyId, JSON.stringify(config));

    if (!config) {
      console.log('没有找到代理配置，清除设置');
      clearProxySettings();
      return;
    }

    if (config.type === 'direct') {
      console.log('使用直接连接');
      clearProxySettings();
    } else if (config.type === 'auto') {
      console.log('应用自动切换规则');
      applyAutoProxyConfig(config, proxyConfigs);
    } else {
      console.log('应用代理设置:', JSON.stringify(config));
      setProxySettings(config);
    }

    // 更新图标状态
    updateIcon(config);
  });
}

// 应用自动切换规则
function applyAutoProxyConfig(autoConfig, proxyConfigs) {
  console.log('应用自动切换规则:', JSON.stringify(autoConfig));

  // 创建 PAC 脚本
  let pacScript = generatePacScript(autoConfig, proxyConfigs);

  console.log('应用 PAC 脚本:', pacScript);

  // 应用 PAC 脚本
  chrome.proxy.settings.set({
    value: {
      mode: "pac_script",
      pacScript: {
        data: pacScript
      }
    },
    scope: 'regular'
  }, function () {
    if (chrome.runtime.lastError) {
      console.error('设置 PAC 脚本时出错:', chrome.runtime.lastError);

      // 尝试使用 Base64 编码
      try {
        const base64Script = btoa(unescape(encodeURIComponent(pacScript)));
        chrome.proxy.settings.set({
          value: {
            mode: "pac_script",
            pacScript: {
              data: pacScript,
              dataType: "base64"
            }
          },
          scope: 'regular'
        }, function () {
          if (chrome.runtime.lastError) {
            console.error('使用 Base64 编码设置 PAC 脚本时出错:', chrome.runtime.lastError);
          } else {
            console.log('PAC 脚本已成功应用 (Base64 编码)');
          }
        });
      } catch (e) {
        console.error('Base64 编码 PAC 脚本时出错:', e);
      }
    } else {
      console.log('PAC 脚本已成功应用');
    }
  });
}

// 生成 PAC 脚本
function generatePacScript(autoConfig, proxyConfigs) {
  const defaultProxyId = autoConfig.defaultProxy || 'direct';
  const defaultProxy = proxyConfigs[defaultProxyId] || proxyConfigs.direct;

  // 构建规则数组
  const rules = autoConfig.rules || [];

  // 构建 PAC 脚本
  let pacScript = `
    function FindProxyForURL(url, host) {
      url = url.toLowerCase();
      host = host.toLowerCase();

      function regExpMatch(str, pattern) {
        try {
          return new RegExp(pattern).test(str);
        } catch (e) {
          return false;
        }
      }
  `;

  // 添加规则匹配逻辑
  rules.forEach(rule => {
    const proxyId = rule.proxyId;
    if (!proxyConfigs[proxyId]) return;

    const proxyConfig = proxyConfigs[proxyId];
    let proxyString = '';

    if (proxyId === 'direct' || proxyConfig.type === 'direct') {
      proxyString = 'DIRECT';
    } else {
      const type = proxyConfig.type.toUpperCase();
      if (type === 'HTTP' || type === 'HTTPS')
      {
        proxyString = `PROXY ${proxyConfig.host}:${proxyConfig.port}`;
      } else {
        proxyString = `${type} ${proxyConfig.host}:${proxyConfig.port}`;
      }
      
    }

    // 检查是否是正则表达式模式 (/pattern/)
    const isRegex = rule.pattern.length > 2 && 
                    rule.pattern.startsWith('/') && 
                    rule.pattern.endsWith('/');
    
    // 根据匹配类型和模式类型使用不同的匹配函数
    const matchType = rule.matchType || 'url';
    
    if (isRegex) {
      // 提取正则表达式内容（去掉开头和结尾的斜杠）
      const regexPattern = rule.pattern.substring(1, rule.pattern.length - 1);
      
      if (matchType === 'host') {
        pacScript += `
      if (regExpMatch(host, "${regexPattern}")) {
        return "${proxyString}";
      }
      `;
      } else {
        pacScript += `
      if (regExpMatch(url, "${regexPattern}")) {
        return "${proxyString}";
      }
      `;
      }
    } else {
      // 使用通配符匹配
      if (matchType === 'host') {
        pacScript += `
      if (shExpMatch(host, "${rule.pattern}")) {
        return "${proxyString}";
      }
      `;
      } else {
        pacScript += `
      if (shExpMatch(url, "${rule.pattern}")) {
        return "${proxyString}";
      }
      `;
      }
    }
  });

  // 添加默认代理
  let defaultProxyString = '';
  if (defaultProxyId === 'direct' || defaultProxy.type === 'direct') {
    defaultProxyString = 'DIRECT';
  } else {
    const type = defaultProxy.type.toUpperCase();
    defaultProxyString = `${type} ${defaultProxy.host}:${defaultProxy.port}`;
  }

  pacScript += `
      return "${defaultProxyString}";
    }
  `;

  return pacScript;
}

// 清除代理设置
function clearProxySettings() {
  console.log('正在清除代理设置...');
  chrome.proxy.settings.clear({ scope: 'regular' }, () => {
    if (chrome.runtime.lastError) {
      console.error('清除代理设置时出错:', chrome.runtime.lastError);
    } else {
      console.log('代理设置已成功清除');
    }
  });
}

// 设置代理
function setProxySettings(config) {
  console.log('设置代理配置:', JSON.stringify(config));

  try {
    const proxyConfig = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: config.type,
          host: config.host,
          port: parseInt(config.port, 10)
        },
        bypassList: []
      }
    };

    console.log('应用代理设置:', JSON.stringify(proxyConfig));

    // 应用代理设置
    chrome.proxy.settings.set(
      { value: proxyConfig, scope: 'regular' },
      function () {
        if (chrome.runtime.lastError) {
          console.error('设置代理时出错:', chrome.runtime.lastError);
          return;
        }

        console.log('代理设置成功应用');

        // 为所有类型的代理设置认证处理程序（如果需要）
        if (config.auth && config.username && config.password) {
          setupProxyAuth(config);
        }
      }
    );
  } catch (error) {
    console.error('设置代理时发生异常:', error);
  }
}

function setupProxyAuth(config) {
  // 注意：预留函数位置，目前不支持自动认证，不支持 socks5 代理认证，以下代码无效

  // 移除之前的认证监听器
  removeAuthHandler();

  // 添加新的认证监听器
  chrome.webRequest.onAuthRequired.addListener(
    (details, callback) => {
      callback({
        authCredentials: {
          username: config.username,
          password: config.password
        }
      });
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
  );
}

function removeAuthHandler() {
  if (chrome.webRequest.onAuthRequired.hasListeners()) {
    chrome.webRequest.onAuthRequired.removeListener();
  }
}

// 更新图标状态
function updateIcon(config) {
  // 根据代理类型更改图标颜色或徽章
  if (config.type === 'direct') {
    chrome.action.setBadgeText({ text: '' });
  } else if (config.type === 'auto') {
    chrome.action.setBadgeText({ text: 'Auto' });
    chrome.action.setBadgeBackgroundColor({ color: '#8BC34A' });
  }
  else {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#8BC34A' });
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
  chrome.storage.local.get(['proxyConfigs', 'activeProxy'], function (result) {
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

    chrome.storage.local.set({ proxyConfigs: proxyConfigs }, function () {
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
  chrome.storage.local.get(['proxyConfigs'], function (result) {
    let proxyConfigs = result.proxyConfigs || {};

    // 合并配置
    proxyConfigs = { ...proxyConfigs, ...configs };

    chrome.storage.local.set({ proxyConfigs: proxyConfigs }, function () {
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
  chrome.storage.local.get('proxyConfigs', function (data) {
    console.log('获取到现有代理配置');
    const proxyConfigs = data.proxyConfigs || {};

    // 生成唯一ID
    const proxyId = 'proxy_' + Date.now();
    console.log('生成代理ID:', proxyId);

    // 添加新配置
    proxyConfigs[proxyId] = config;

    // 保存更新后的配置
    saveProxyConfigs(proxyConfigs, () => {
      callback(true, proxyId);
    }, (error) => {
      callback(false, null, error);
    });
  });
}

// 更新代理配置
function updateProxyConfig(proxyId, config, callback) {
  console.log('开始更新代理配置:', proxyId, config);
  chrome.storage.local.get('proxyConfigs', function (data) {
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
    saveProxyConfigs(proxyConfigs, () => {
      callback(true);
    }, (error) => {
      callback(false, error);
    });
  });
}

// 辅助函数：保存代理配置
function saveProxyConfigs(proxyConfigs, onSuccess, onError) {
  console.log('准备保存代理配置');
  chrome.storage.local.set({ proxyConfigs }, function () {
    console.log('代理配置已保存');
    if (chrome.runtime.lastError) {
      console.error('保存代理配置时出错:', chrome.runtime.lastError);
      if (onError) onError(chrome.runtime.lastError.message);
    } else {
      console.log('成功保存代理配置，调用回调');
      if (onSuccess) onSuccess();
    }
  });
}

// 设置活动代理
function setActiveProxy(proxyId, callback) {
  chrome.storage.local.set({ activeProxy: proxyId }, function () {
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