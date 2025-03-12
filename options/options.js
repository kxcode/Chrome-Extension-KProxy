let currentProxyId = null;
let activeProxyId = null;
let proxyConfigs = {};
let editingAutoProxyId = null;

function initOptionsPage() {
  // 确保导入模态窗口默认隐藏
  const importModal = document.getElementById('importModal');
  if (importModal) {
    importModal.classList.add('hidden');
  }
  
  // 确保规则模态窗口默认隐藏
  const ruleModal = document.getElementById('ruleModal');
  if (ruleModal) {
    ruleModal.classList.add('hidden');
  }
  
  // 确保欢迎界面显示，表单隐藏
  document.getElementById('welcomeMessage').classList.remove('hidden');
  document.getElementById('proxyForm').classList.add('hidden');
  
  // 如果存在自动代理表单，也确保它隐藏
  const autoProxyForm = document.getElementById('autoProxyForm');
  if (autoProxyForm) {
    autoProxyForm.classList.add('hidden');
  }
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
  
  // 绑定添加自动代理按钮事件
  const addAutoProxyBtn = document.getElementById('addAutoProxyBtn');
  if (addAutoProxyBtn) {
    addAutoProxyBtn.addEventListener('click', showAddAutoProxyForm);
  }
  
  // 绑定保存自动代理按钮事件
  const saveAutoProxyBtn = document.getElementById('saveAutoProxyBtn');
  if (saveAutoProxyBtn) {
    saveAutoProxyBtn.addEventListener('click', saveAutoProxyConfig);
  }
  
  // 绑定取消自动代理按钮事件
  const cancelAutoProxyBtn = document.getElementById('cancelAutoProxyBtn');
  if (cancelAutoProxyBtn) {
    cancelAutoProxyBtn.addEventListener('click', hideAutoProxyForm);
  }
  
  // 绑定删除自动代理按钮事件
  const deleteAutoProxyBtn = document.getElementById('deleteAutoProxyBtn');
  if (deleteAutoProxyBtn) {
    deleteAutoProxyBtn.addEventListener('click', deleteAutoProxyConfig);
  }
  
  // 绑定添加规则按钮事件
  const addRuleBtn = document.getElementById('addRuleBtn');
  if (addRuleBtn) {
    addRuleBtn.addEventListener('click', showAddRuleModal);
  }
  
  // 绑定保存规则按钮事件
  const saveRuleBtn = document.getElementById('saveRuleBtn');
  if (saveRuleBtn) {
    saveRuleBtn.addEventListener('click', saveRule);
  }
  
  // 绑定取消规则按钮事件
  const cancelRuleBtn = document.getElementById('cancelRuleBtn');
  if (cancelRuleBtn) {
    cancelRuleBtn.addEventListener('click', hideRuleModal);
  }
  
  // 绑定导入规则按钮事件
  const importRulesBtn = document.getElementById('importRulesBtn');
  if (importRulesBtn) {
    importRulesBtn.addEventListener('click', importRules);
  }
});

// 加载代理配置
function loadProxyConfigs() {
  chrome.runtime.sendMessage({ action: 'getProxyConfigs' }, function(response) {
    proxyConfigs = response.proxyConfigs;
    const activeProxy = response.activeProxy;
    activeProxyId = activeProxy;
    
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
  
  // 添加自动代理类标识
  if (config.type === 'auto') {
    proxyItem.className += ' auto-proxy';
  }
  
  proxyItem.dataset.proxyId = proxyId;
  
  let iconHtml = '';
  let infoHtml = '';
  
  if (config.type === 'direct') {
    iconHtml = '<span>🔗</span>';
    infoHtml = '直接连接到互联网';
  } else if (config.type === 'auto') {
    iconHtml = '<span>🔌</span>';
    infoHtml = '自动切换规则';
  } else {
    iconHtml = getProxyTypeIcon(config.type);
    infoHtml = `${config.type.toUpperCase()} - ${config.host}:${config.port}`;
  }
  
  proxyItem.innerHTML = `
    <div class="proxy-item-icon ${config.type === 'auto' ? 'auto' : ''}">${iconHtml}</div>
    <div class="proxy-item-details">
      <div class="proxy-name">${config.name}</div>
      <div class="proxy-info">${infoHtml}</div>
    </div>
  `;
  
  // 点击编辑代理
  proxyItem.addEventListener('click', function() {
    if (config.type === 'auto') {
      editAutoProxy(proxyId);
    } else {
      editProxy(proxyId);
    }
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
  
  // 如果是自动代理类型，调用自动代理编辑函数
  if (config.type === 'auto') {
    editAutoProxy(proxyId);
    return;
  }
  
  // 设置当前编辑的代理ID
  currentProxyId = proxyId;
  
  // 设置表单标题
  document.getElementById('formTitle').textContent = '编辑代理';
  
  // 如果是直接连接
  if (config.type === 'direct') {
    // 隐藏不需要的表单组
    const formGroups = document.querySelectorAll('.form-group');
    formGroups.forEach((group, index) => {
      if (index > 0) { // 保留名称字段
        group.style.display = 'none';
      }
    });
    
    // 填充名称
    document.getElementById('proxyName').value = config.name;
    
    // 添加直接连接说明文本
    const formElement = document.getElementById('proxyForm');
    if (!document.getElementById('directConnectionInfo')) {
      const infoElement = document.createElement('div');
      infoElement.id = 'directConnectionInfo';
      infoElement.className = 'direct-connection-info';
      infoElement.innerHTML = `
        <p>直接连接模式下，浏览器将不使用任何代理服务器，直接连接到互联网。</p>
        <p>这是浏览器的默认连接方式。</p>
      `;
      formElement.insertBefore(infoElement, document.querySelector('.form-actions'));
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
    
    // 显示删除按钮
    document.getElementById('deleteProxyBtn').classList.remove('hidden');
  }
  
  // 显示表单
  document.getElementById('proxyForm').classList.remove('hidden');
  document.getElementById('welcomeMessage').classList.add('hidden');
  
  // 如果存在自动代理表单，确保它隐藏
  const autoProxyForm = document.getElementById('autoProxyForm');
  if (autoProxyForm) {
    autoProxyForm.classList.add('hidden');
  }
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
    
    if (type !== 'direct' && (!host || !port)) {
      alert('请输入服务器地址和端口');
      return;
    }
    
    config.type = type;
    config.host = host;
    config.port = parseInt(port, 10);
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
          // 检查是否需要刷新当前激活的代理
          if (activeProxyId === currentProxyId) {
            chrome.runtime.sendMessage({
              action: 'setActiveProxy',
              proxyId: currentProxyId
            });
          }
          
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
  const importModal = document.getElementById('importModal');
  importModal.classList.remove('hidden');
  importModal.style.display = 'flex';
  document.getElementById('importData').value = '';
}

// 隐藏导入模态框
function hideImportModal() {
  const importModal = document.getElementById('importModal');
  importModal.classList.add('hidden');
  importModal.style.display = 'none';
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

// 添加规则到列表
function addRuleToList(rule) {
  const ruleList = document.getElementById('ruleList');
  const ruleItem = document.createElement('div');
  ruleItem.className = 'rule-item';
  ruleItem.dataset.pattern = rule.pattern;
  ruleItem.dataset.proxyId = rule.proxyId;
  // 添加匹配类型字段，默认为 'url'
  ruleItem.dataset.matchType = rule.matchType || 'url';
  
  const proxyName = rule.proxyId === 'direct' ? '直接连接' : 
    (proxyConfigs[rule.proxyId] ? proxyConfigs[rule.proxyId].name : '未知代理');
  
  // 添加匹配类型图标
  const matchTypeIcon = rule.matchType === 'host' ? '🏠' : '🔗';
  
  ruleItem.innerHTML = `
    <div class="rule-match-type" title="${rule.matchType === 'host' ? '主机名匹配' : 'URL匹配'}">${matchTypeIcon}</div>
    <div class="rule-pattern">${rule.pattern}</div>
    <div class="rule-proxy">${proxyName}</div>
    <div class="rule-delete">✕</div>
  `;
  
  // 添加删除规则事件
  ruleItem.querySelector('.rule-delete').addEventListener('click', function(e) {
    e.stopPropagation();
    ruleItem.remove();
  });
  
  // 添加编辑规则事件
  ruleItem.addEventListener('click', function() {
    editRule(ruleItem);
  });
  
  ruleList.appendChild(ruleItem);
}

// 编辑规则
function editRule(ruleItem) {
  // 获取规则项的索引
  const ruleItems = document.querySelectorAll('#ruleList .rule-item');
  currentRuleIndex = Array.from(ruleItems).indexOf(ruleItem);
  
  // 填充表单
  document.getElementById('rulePattern').value = ruleItem.dataset.pattern;
  
  // 设置匹配类型
  const matchType = ruleItem.dataset.matchType || 'url';
  document.getElementById('ruleMatchType').value = matchType;
  
  // 填充代理下拉框
  populateProxyDropdown('ruleProxy');
  document.getElementById('ruleProxy').value = ruleItem.dataset.proxyId;
  
  // 显示模态框
  const ruleModal = document.getElementById('ruleModal');
  ruleModal.classList.remove('hidden');
  ruleModal.style.display = 'flex';
}

// 导入规则
function importRules() {
  const rulesText = document.getElementById('ruleImport').value.trim();
  if (!rulesText) {
    alert('请输入要导入的规则');
    return;
  }
  
  const lines = rulesText.split('\n');
  let importedCount = 0;
  
  lines.forEach(line => {
    line = line.trim();
    // 跳过规则中的空行、注释行
    if (!line || line.startsWith('!') || line.startsWith('[')) return;
    
    // 确定匹配类型，默认为URL匹配
    let matchType = 'url';
    let proxyId = document.getElementById('defaultProxy').value;

    // 处理 AutoProxy 格式规则

    // 处理例外规则，强制使用直接连接
    if (line.startsWith('@@')) {
      proxyId = 'direct';
      line = line.substring(2);
    }
      
    if (line.startsWith('||')) {
      // 例如 ||example.com
      line = '*' + line.substring(2);
      matchType = 'host'; // 双竖线通常表示主机名匹配
    } else if (line.startsWith('|')) {
      line = line.substring(1) + "*";
      matchType = 'url'; // 单竖线通常表示URL开头匹配
    } else if (!line.includes('/')) {
      // 子域名通配，例如 example.com
      line = '*' + line;
      matchType = 'host'
    } else if (line.length > 1 && line.startsWith('/') && line.endsWith('/')) {
      // 正则表达式，保留正则表达式
      line = line
      matchType = 'url';
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      // 例如 http://example.com
      line = line + "*"
      matchType = 'url';
    }

    // 添加规则
    addRuleToList({
      pattern: line,
      proxyId: proxyId,
      matchType: matchType
    });
    
    importedCount++;
  });
  
  // 清空导入文本框
  document.getElementById('ruleImport').value = '';
  // saveAutoProxyConfig();
  alert(`成功导入 ${importedCount} 条规则，请注意保存规则配置！`);
}

// 显示添加自动切换规则表单
function showAddAutoProxyForm() {
  // 隐藏其他表单，显示自动代理表单
  document.getElementById('proxyForm').classList.add('hidden');
  document.getElementById('welcomeMessage').classList.add('hidden');
  document.getElementById('autoProxyForm').classList.remove('hidden');
  
  // 清除表单数据
  document.getElementById('autoProxyName').value = '';
  document.getElementById('ruleList').innerHTML = '';
  document.getElementById('ruleImport').value = '';
  
  // 隐藏删除按钮
  document.getElementById('deleteAutoProxyBtn').classList.add('hidden');
  
  // 填充默认代理下拉框
  populateProxyDropdown('defaultProxy');
  
  // 清除编辑状态
  editingAutoProxyId = null;
}

// 隐藏自动代理表单
function hideAutoProxyForm() {
  document.getElementById('autoProxyForm').classList.add('hidden');
  document.getElementById('welcomeMessage').classList.remove('hidden');
  editingAutoProxyId = null;
}

// 编辑自动切换规则
function editAutoProxy(proxyId) {
  const config = proxyConfigs[proxyId];
  if (!config || config.type !== 'auto') return;
  
  // 设置当前编辑的自动代理ID
  editingAutoProxyId = proxyId;
  
  // 隐藏其他表单，显示自动代理表单
  document.getElementById('proxyForm').classList.add('hidden');
  document.getElementById('welcomeMessage').classList.add('hidden');
  document.getElementById('autoProxyForm').classList.remove('hidden');
  
  // 填充表单数据
  document.getElementById('autoProxyName').value = config.name || '';
  
  // 填充默认代理下拉框
  populateProxyDropdown('defaultProxy');
  
  // 设置默认代理
  document.getElementById('defaultProxy').value = config.defaultProxy || 'direct';
  
  // 清空规则列表
  document.getElementById('ruleList').innerHTML = '';
  
  // 添加规则
  if (config.rules && Array.isArray(config.rules)) {
    config.rules.forEach(rule => {
      addRuleToList(rule);
    });
  }
  
  // 显示删除按钮
  document.getElementById('deleteAutoProxyBtn').classList.remove('hidden');
}

// 填充代理下拉框
function populateProxyDropdown(selectId) {
  const select = document.getElementById(selectId);
  
  // 保存当前选中的值
  const currentValue = select.value;
  
  // 清除现有选项（保留第一个直接连接选项）
  while (select.options.length > 1) {
    select.remove(1);
  }
  
  // 添加代理选项
  for (const proxyId in proxyConfigs) {
    if (proxyId !== 'direct' && proxyConfigs[proxyId].type !== 'auto') {
      const option = document.createElement('option');
      option.value = proxyId;
      option.textContent = proxyConfigs[proxyId].name;
      select.appendChild(option);
    }
  }
  
  // 尝试恢复之前选中的值
  if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
    select.value = currentValue;
  }
}

// 保存规则
function saveRule() {
  const pattern = document.getElementById('rulePattern').value;
  const proxyId = document.getElementById('ruleProxy').value;
  const matchType = document.getElementById('ruleMatchType').value;
  
  if (!pattern) {
    alert('请输入URL模式');
    return;
  }
  
  console.log('保存规则:', pattern, proxyId, matchType, '当前规则索引:', currentRuleIndex);
  
  if (currentRuleIndex >= 0) {
    // 更新现有规则
    const ruleItems = document.querySelectorAll('#ruleList .rule-item');
    if (currentRuleIndex < ruleItems.length) {
      const ruleItem = ruleItems[currentRuleIndex];
      ruleItem.dataset.pattern = pattern;
      ruleItem.dataset.proxyId = proxyId;
      ruleItem.dataset.matchType = matchType;
      
      const proxyName = proxyId === 'direct' ? '直接连接' : 
        (proxyConfigs[proxyId] ? proxyConfigs[proxyId].name : '未知代理');
      
      // 更新匹配类型图标
      const matchTypeIcon = matchType === 'host' ? '🏠' : '🔗';
      ruleItem.querySelector('.rule-match-type').innerHTML = matchTypeIcon;
      ruleItem.querySelector('.rule-match-type').title = matchType === 'host' ? '主机名匹配' : 'URL匹配';
      
      ruleItem.querySelector('.rule-pattern').textContent = pattern;
      ruleItem.querySelector('.rule-proxy').textContent = proxyName;
    }
  } else {
    // 添加新规则
    addRuleToList({
      pattern: pattern,
      proxyId: proxyId,
      matchType: matchType
    });
  }
  
  // 隐藏模态框
  hideRuleModal();
  // saveAutoProxyConfig();
}

// 保存自动切换规则
function saveAutoProxyConfig() {
  try {
    const name = document.getElementById('autoProxyName').value.trim();
    if (!name) {
      alert('请输入规则名称');
      return;
    }
    
    // 获取默认代理
    const defaultProxy = document.getElementById('defaultProxy').value;
    
    // 获取规则列表
    const ruleItems = document.querySelectorAll('#ruleList .rule-item');
    const rules = [];
    
    // 调试信息
    console.log('规则项数量:', ruleItems.length);
    
    ruleItems.forEach(item => {
      console.log('规则项:', item.dataset.pattern, item.dataset.proxyId, item.dataset.matchType);
      rules.push({
        pattern: item.dataset.pattern,
        proxyId: item.dataset.proxyId,
        matchType: item.dataset.matchType || 'url' // 确保有默认值
      });
    });
    
    // 构建配置对象
    const config = {
      name: name,
      type: 'auto',
      defaultProxy: defaultProxy,
      rules: rules
    };
    
    console.log('保存的自动代理配置:', config);
    
    // 禁用保存按钮，显示保存中状态
    const saveBtn = document.getElementById('saveAutoProxyBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '保存中...';
    saveBtn.disabled = true;
    
    // 设置超时，防止长时间无响应
    const timeoutId = setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
      alert('保存超时，请重试');
    }, 5000);
    
    if (editingAutoProxyId) {
      // 更新现有配置
      chrome.runtime.sendMessage({
        action: 'updateProxyConfig',
        proxyId: editingAutoProxyId,
        config: config
      }, function(response) {
        clearTimeout(timeoutId);
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        
        if (chrome.runtime.lastError) {
          console.error('更新自动切换规则时出错:', chrome.runtime.lastError);
          alert('保存失败: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.success) {
          alert('保存成功');
          // 检查是否需要刷新当前激活的代理
          if (activeProxyId === editingAutoProxyId) {
            chrome.runtime.sendMessage({
              action: 'setActiveProxy',
              proxyId: editingAutoProxyId
            });
          }
          
          // 重新加载代理配置
          loadProxyConfigs();
          hideAutoProxyForm();
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
        
        if (chrome.runtime.lastError) {
          console.error('添加自动切换规则时出错:', chrome.runtime.lastError);
          alert('保存失败: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.success) {
          // 设置编辑模式为新创建的规则
          editingAutoProxyId = response.proxyId;
          
          // 更新表单标题和删除按钮状态
          document.getElementById('deleteAutoProxyBtn').classList.remove('hidden');
          
          alert('创建成功');
          
          // 重新加载代理配置
          loadProxyConfigs();
          hideAutoProxyForm();
        } else {
          alert('保存失败: ' + (response ? response.error : '未知错误'));
        }
      });
    }
  } catch (error) {
    console.error('保存过程中发生错误:', error);
    alert('保存失败: ' + error.message);
  }
}

// 隐藏规则模态框
function hideRuleModal() {
  const ruleModal = document.getElementById('ruleModal');
  ruleModal.classList.add('hidden');
  ruleModal.style.display = 'none';
}

// 删除自动切换规则
function deleteAutoProxyConfig() {
  if (!editingAutoProxyId) return;
  
  if (confirm('确定要删除此自动切换规则吗？')) {
    chrome.runtime.sendMessage({
      action: 'deleteProxyConfig',
      proxyId: editingAutoProxyId
    }, function(response) {
      if (response.success) {
        // 重新加载配置列表
        loadProxyConfigs();
        
        // 隐藏表单
        hideAutoProxyForm();
      } else {
        alert(response.error || '无法删除自动切换规则');
      }
    });
  }
}

// 显示添加规则模态框
function showAddRuleModal() {
  console.log('显示添加规则模态框');
  
  // 填充代理下拉框
  populateProxyDropdown('ruleProxy');
  
  // 清空输入
  document.getElementById('rulePattern').value = '';
  
  // 显示模态框
  const ruleModal = document.getElementById('ruleModal');
  ruleModal.classList.remove('hidden');
  ruleModal.style.display = 'flex';
  
  // 设置当前规则索引为-1（表示添加新规则）
  currentRuleIndex = -1;
} 