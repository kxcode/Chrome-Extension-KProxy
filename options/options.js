let currentProxyId = null;
let proxyConfigs = {};

function initOptionsPage() {
  // 确保导入模态窗口默认隐藏
  const importModal = document.getElementById('importModal');
  if (importModal) {
    importModal.classList.add('hidden');
  }
  
  // 确保欢迎界面显示，表单隐藏
  document.getElementById('welcomeMessage').classList.remove('hidden');
  document.getElementById('proxyForm').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('选项页面已加载');
  
  // 检查导入模态窗口状态
  const importModal = document.getElementById('importModal');
  console.log('导入模态窗口状态:', importModal.classList.contains('hidden') ? '隐藏' : '显示');
  
  // 强制隐藏导入模态窗口
  importModal.classList.add('hidden');
  console.log('已强制隐藏导入模态窗口');
  
  // 初始化页面
  initOptionsPage();
  
  // 加载代理配置
  loadProxyConfigs();
  
  // 绑定添加代理按钮事件
  document.getElementById('addProxyBtn').addEventListener('click', showAddProxyForm);
  
  // 绑定保存代理按钮事件
  document.getElementById('saveProxyBtn').addEventListener('click', saveProxyConfig);
  
  // 绑定取消按钮事件
  document.getElementById('cancelBtn').addEventListener('click', hideProxyForm);
  
  // 绑定删除代理按钮事件
  document.getElementById('deleteProxyBtn').addEventListener('click', deleteProxyConfig);
  
  // 绑定认证复选框事件
  document.getElementById('proxyAuth').addEventListener('change', function() {
    const authFields = document.getElementById('authFields');
    if (this.checked) {
      authFields.style.display = 'block';
    } else {
      authFields.style.display = 'none';
    }
  });
  
  // 绑定导入按钮事件
  document.getElementById('importBtn').addEventListener('click', showImportModal);
  
  // 绑定导出按钮事件
  document.getElementById('exportBtn').addEventListener('click', exportConfigs);
  
  // 绑定确认导入按钮事件
  document.getElementById('confirmImportBtn').addEventListener('click', importConfigs);
  
  // 绑定取消导入按钮事件
  document.getElementById('cancelImportBtn').addEventListener('click', hideImportModal);
  
  // 在页面加载后延迟检查模态窗口状态
  setTimeout(function() {
    const importModal = document.getElementById('importModal');
    if (!importModal.classList.contains('hidden')) {
      console.log('模态窗口仍然显示，强制隐藏');
      importModal.classList.add('hidden');
      importModal.style.display = 'none';
    }
  }, 100);
  
  // 添加作者链接事件
  const authorLink = document.getElementById('authorLink');
  if (authorLink) {
    authorLink.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/kxcode' });
    });
  }
});

// 加载代理配置
function loadProxyConfigs() {
  chrome.runtime.sendMessage({ action: 'getProxyConfigs' }, function(response) {
    proxyConfigs = response.proxyConfigs;
    const activeProxy = response.activeProxy;
    
    const proxyListElement = document.querySelector('.proxy-list');
    proxyListElement.innerHTML = '';
    
    // 首先添加直接连接选项
    if (proxyConfigs.direct) {
      addProxyItemToList(proxyConfigs.direct, 'direct', activeProxy === 'direct', proxyListElement);
    }
    
    // 添加其他代理配置
    for (const proxyId in proxyConfigs) {
      if (proxyId !== 'direct') {
        const config = proxyConfigs[proxyId];
        addProxyItemToList(config, proxyId, activeProxy === proxyId, proxyListElement);
      }
    }
    
    // 如果没有配置，显示提示
    if (Object.keys(proxyConfigs).length === 0) {
      proxyListElement.innerHTML = '<div class="no-proxies">没有可用的代理配置。</div>';
    }
    
    // 确保欢迎界面显示
    document.getElementById('welcomeMessage').classList.remove('hidden');
    document.getElementById('proxyForm').classList.add('hidden');
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
  
  // 点击编辑代理
  proxyItem.addEventListener('click', function() {
    editProxy(proxyId);
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

// 显示添加代理表单
function showAddProxyForm() {
  // 重置表单
  const form = document.getElementById('proxyForm');
  
  // 移除直接连接说明文本（如果存在）
  const directInfoElement = document.getElementById('directConnectionInfo');
  if (directInfoElement) {
    directInfoElement.remove();
  }
  
  // 显示所有表单组
  const formGroups = document.querySelectorAll('.form-group');
  formGroups.forEach(group => {
    group.style.display = 'flex';
  });
  
  // 清除之前的输入
  document.getElementById('proxyName').value = '';
  document.getElementById('proxyType').value = 'http';
  document.getElementById('proxyHost').value = '';
  document.getElementById('proxyPort').value = '';
  document.getElementById('proxyAuth').checked = false;
  
  // 隐藏认证字段
  const authFields = document.getElementById('authFields');
  authFields.style.display = 'none';
  document.getElementById('authType').value = 'basic';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  
  // 更新表单标题
  document.getElementById('formTitle').textContent = '添加代理';
  
  // 隐藏删除按钮
  document.getElementById('deleteProxyBtn').classList.add('hidden');
  
  // 显示表单
  form.classList.remove('hidden');
  document.getElementById('welcomeMessage').classList.add('hidden');
  
  // 清除当前编辑的代理ID
  currentProxyId = null;
}

// 编辑代理
function editProxy(proxyId) {
  const config = proxyConfigs[proxyId];
  if (!config) return;
  
  // 设置当前编辑的代理ID
  currentProxyId = proxyId;
  
  // 更新表单标题
  document.getElementById('formTitle').textContent = '编辑代理';
  
  // 如果是直接连接选项，显示特殊表单
  if (proxyId === 'direct' || config.type === 'direct') {
    // 更新表单标题
    document.getElementById('formTitle').textContent = '直接连接设置';
    
    // 填充表单数据
    document.getElementById('proxyName').value = config.name || '直接连接';
    
    // 隐藏除了第一个表单组（名称）之外的所有表单组
    const formGroups = document.querySelectorAll('.form-group');
    formGroups.forEach((group, index) => {
      if (index === 0) {
        group.style.display = 'flex'; // 确保名称字段显示
      } else {
        group.style.display = 'none'; // 隐藏其他所有字段
      }
    });
    
    // 隐藏认证字段容器
    const authFields = document.getElementById('authFields');
    if (authFields) {
      authFields.style.display = 'none';
    }
    
    // 显示说明文本
    const directInfoElement = document.createElement('div');
    directInfoElement.id = 'directConnectionInfo';
    directInfoElement.className = 'direct-connection-info';
    directInfoElement.innerHTML = `
      <p>直接连接模式下，浏览器将不使用任何代理服务器，直接连接到目标网站。</p>
      <p>您可以修改此选项的显示名称，但无法更改其他设置。</p>
    `;
    
    // 检查是否已存在说明文本，如果不存在则添加
    if (!document.getElementById('directConnectionInfo')) {
      const formElement = document.getElementById('proxyForm');
      formElement.insertBefore(directInfoElement, document.querySelector('.form-actions'));
    }
    
    // 隐藏删除按钮
    document.getElementById('deleteProxyBtn').classList.add('hidden');
  } else {
    // 移除直接连接说明文本（如果存在）
    const directInfoElement = document.getElementById('directConnectionInfo');
    if (directInfoElement) {
      directInfoElement.remove();
    }
    
    // 显示所有表单组
    const formGroups = document.querySelectorAll('.form-group');
    formGroups.forEach(group => {
      group.style.display = 'flex';
    });
    
    // 填充表单数据
    document.getElementById('proxyName').value = config.name;
    document.getElementById('proxyType').value = config.type;
    document.getElementById('proxyHost').value = config.host || '';
    document.getElementById('proxyPort').value = config.port || '';
    
    const authCheckbox = document.getElementById('proxyAuth');
    authCheckbox.checked = config.auth || false;
    
    // 显示/隐藏认证字段
    const authFields = document.getElementById('authFields');
    if (config.auth) {
      authFields.style.display = 'block';
      document.getElementById('authType').value = config.authType || 'basic';
      document.getElementById('username').value = config.username || '';
      document.getElementById('password').value = config.password || '';
    } else {
      authFields.style.display = 'none';
    }
    
    // 显示删除按钮
    document.getElementById('deleteProxyBtn').classList.remove('hidden');
  }
  
  // 显示表单
  document.getElementById('proxyForm').classList.remove('hidden');
  document.getElementById('welcomeMessage').classList.add('hidden');
}

// 隐藏代理表单
function hideProxyForm() {
  document.getElementById('proxyForm').classList.add('hidden');
  document.getElementById('welcomeMessage').classList.remove('hidden');
  currentProxyId = null;
}

// 保存代理配置
function saveProxyConfig() {
  // 获取表单数据
  const name = document.getElementById('proxyName').value;
  
  if (!name) {
    alert('请输入代理名称');
    return;
  }
  
  let config = {
    name: name
  };
  
  // 如果是直接连接选项，只更新名称
  if (currentProxyId === 'direct') {
    config.type = 'direct';
  } else {
    // 获取其他表单数据
    const type = document.getElementById('proxyType').value;
    const host = document.getElementById('proxyHost').value;
    const port = document.getElementById('proxyPort').value;
    const auth = document.getElementById('proxyAuth').checked;
    
    if (type !== 'direct' && (!host || !port)) {
      alert('请输入服务器地址和端口');
      return;
    }
    
    config.type = type;
    config.host = host;
    config.port = parseInt(port, 10);
    config.auth = auth;
    
    if (auth) {
      config.authType = document.getElementById('authType').value;
      config.username = document.getElementById('username').value;
      config.password = document.getElementById('password').value;
      
      if (!config.username || !config.password) {
        alert('请输入用户名和密码');
        return;
      }
    }
  }
  
  // 显示保存中提示
  const saveBtn = document.getElementById('saveProxyBtn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = '保存中...';
  saveBtn.disabled = true;
  
  // 设置超时处理
  const timeoutId = setTimeout(() => {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
    alert('保存超时，请重试');
  }, 5000); // 5秒超时
  
  try {
    // 保存配置
    if (currentProxyId) {
      // 更新现有配置
      chrome.runtime.sendMessage({
        action: 'updateProxyConfig',
        proxyId: currentProxyId,
        config: config
      }, function(response) {
        clearTimeout(timeoutId);
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        
        // 添加错误处理
        if (chrome.runtime.lastError) {
          console.error('更新代理配置时出错:', chrome.runtime.lastError);
          alert('保存失败: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.success) {
          // 重新加载代理配置
          loadProxyConfigs();
          // 隐藏表单
          hideProxyForm();
        } else {
          alert('保存失败: ' + (response ? response.error : '未知错误'));
        }
      });
    } else {
      // 添加新配置
      chrome.runtime.sendMessage({
        action: 'addProxyConfig',
        config: config
      }, function(response) {
        clearTimeout(timeoutId);
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        
        // 添加错误处理
        if (chrome.runtime.lastError) {
          console.error('添加代理配置时出错:', chrome.runtime.lastError);
          alert('保存失败: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.success) {
          // 重新加载代理配置
          loadProxyConfigs();
          // 隐藏表单
          hideProxyForm();
        } else {
          alert('保存失败: ' + (response ? response.error : '未知错误'));
        }
      });
    }
  } catch (error) {
    clearTimeout(timeoutId);
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
    console.error('保存过程中发生错误:', error);
    alert('保存失败: ' + error.message);
  }
}

// 删除代理配置
function deleteProxyConfig() {
  if (!currentProxyId) return;
  
  if (confirm('确定要删除此代理配置吗？')) {
    chrome.runtime.sendMessage({
      action: 'deleteProxyConfig',
      proxyId: currentProxyId
    }, function(response) {
      if (response.success) {
        // 重新加载配置列表
        loadProxyConfigs();
        
        // 隐藏表单
        hideProxyForm();
      } else {
        alert(response.error || '无法删除代理配置');
      }
    });
  }
}

// 显示导入模态框
function showImportModal() {
  document.getElementById('importModal').classList.remove('hidden');
  document.getElementById('importData').value = '';
}

// 隐藏导入模态框
function hideImportModal() {
  document.getElementById('importModal').classList.add('hidden');
}

// 导入配置
function importConfigs() {
  const importData = document.getElementById('importData').value.trim();
  if (!importData) {
    alert('请输入要导入的配置数据');
    return;
  }
  
  try {
    const configs = JSON.parse(importData);
    
    chrome.runtime.sendMessage({
      action: 'importConfigs',
      configs
    }, function(response) {
      if (response.success) {
        // 重新加载配置列表
        loadProxyConfigs();
        
        // 隐藏模态框
        hideImportModal();
        
        alert('配置导入成功');
      }
    });
  } catch (error) {
    alert('导入失败：无效的 JSON 格式');
  }
}

// 导出配置
function exportConfigs() {
  chrome.runtime.sendMessage({
    action: 'exportConfigs'
  }, function(response) {
    if (response.success) {
      const configs = response.configs;
      const exportData = JSON.stringify(configs, null, 2);
      
      // 创建下载链接
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'proxy-configs.json';
      a.click();
      
      URL.revokeObjectURL(url);
    }
  });
} 