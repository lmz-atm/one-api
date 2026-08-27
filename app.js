(function () {
  const SUPABASE_URL = 'https://knykshhjspnfjmqjmqqx.supabase.co';
  const ANON_KEY = 'sb_publishable_PAl2zLGZxfupo_ceCUWEWQ_94HJ0YYv';
  const supabase = window.supabase.createClient(SUPABASE_URL, ANON_KEY);
  const toast = document.getElementById('toast');
  const showToast = (msg, duration = 1800) => {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  };
  const channelMap = { wechat: '微信', alipay: '支付宝', all: '全部' };
  let selectedChannel = 'all';
  const uploadedImages = {};
  let currentStep = 0;
  const TOTAL_STEPS = 4;
  const stepDefs = [
    { title: '基本信息', icon: '基', textFields: ['merchant_name', 'mini_name_wechat', 'mini_name_alipay'], imageFields: [], showChannel: true },
    { title: '资质照片', icon: '资', textFields: ['special_qualification_note'], imageFields: ['business_license_image', 'idcard_front_image', 'idcard_back_image', 'storefront_image', 'store_inside_image', 'mini_avatar_image', 'special_qualification_image'] },
    { title: '联系人信息', icon: '联', textFields: ['admin_wechat_name', 'admin_wechat_phone', 'admin_wechat_email', 'admin_alipay_name', 'admin_alipay_phone', 'admin_alipay_email', 'legal_name', 'legal_wechat_id', 'phone_primary', 'phone_backup'], imageFields: [] },
    { title: '结算信息', icon: '结', textFields: ['bank_account', 'legal_alipay_account', 'bank_name', 'bank_branch', 'remark'], imageFields: [] }
  ];
  const imageFields = [
    { key: 'business_license_image', label: '营业执照', hint: '彩色照片，露出四边', required: true },
    { key: 'idcard_front_image', label: '身份证正面', hint: '清晰无反光', required: true },
    { key: 'idcard_back_image', label: '身份证反面', hint: '清晰无反光', required: true },
    { key: 'storefront_image', label: '门头照', hint: '拍完整门头', required: true },
    { key: 'store_inside_image', label: '店内照', hint: '店内环境', required: true },
    { key: 'mini_avatar_image', label: '小程序头像', hint: '可后续补充', required: false },
    { key: 'special_qualification_image', label: '特殊资质', hint: '如食品经营许可证', required: false }
  ];
  const textFields = [
    { key: 'merchant_name', label: '商户名称', type: 'text', required: true, hint: '建议与营业执照一致' },
    { key: 'admin_wechat_name', label: '微信·管理员姓名', type: 'text', required: true },
    { key: 'admin_wechat_phone', label: '微信·管理员电话', type: 'tel', required: true },
    { key: 'admin_wechat_email', label: '微信·管理员邮箱', type: 'email', required: true },
    { key: 'admin_alipay_name', label: '支付宝·联系人姓名', type: 'text', required: true },
    { key: 'admin_alipay_phone', label: '支付宝·联系人电话', type: 'tel', required: true },
    { key: 'admin_alipay_email', label: '支付宝·联系人邮箱', type: 'email', required: true },
    { key: 'bank_account', label: '对公账号 / 法人账号', type: 'text', required: true, hint: '企业填对公，个体户填法人卡' },
    { key: 'legal_alipay_account', label: '法人实名认证支付宝', type: 'text', required: true },
    { key: 'bank_name', label: '开户银行', type: 'text', required: true },
    { key: 'bank_branch', label: '具体支行', type: 'text', required: true },
    { key: 'legal_name', label: '法人姓名', type: 'text', required: true },
    { key: 'legal_wechat_id', label: '法人微信号', type: 'text', required: true, hint: '微信号，非手机号' },
    { key: 'mini_name_wechat', label: '微信小程序名称', type: 'text', required: true },
    { key: 'mini_name_alipay', label: '支付宝小程序名称', type: 'text', required: true },
    { key: 'phone_primary', label: '商家电话（常用）', type: 'tel', required: true },
    { key: 'phone_backup', label: '商家电话（备用）', type: 'tel', required: true },
    { key: 'special_qualification_note', label: '特殊资质说明', type: 'textarea', required: false },
    { key: 'remark', label: '备注信息', type: 'textarea', required: false }
  ];
  const getFieldDef = (key) => textFields.find(f => f.key === key);
  const getImageDef = (key) => imageFields.find(f => f.key === key);
  const compressImage = (file, maxWidth = 800, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          if (img.width <= maxWidth && file.size <= 300 * 1024) { resolve(e.target.result); return; }
          const ratio = maxWidth / img.width;
          const canvas = document.createElement('canvas');
          canvas.width = maxWidth;
          canvas.height = Math.round(img.height * ratio);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  const validateStep = (stepIdx) => {
    const step = stepDefs[stepIdx];
    const missing = [];
    step.textFields.forEach(key => {
      const def = getFieldDef(key);
      if (!def || !def.required) return;
      const el = document.querySelector(`[data-key="${key}"]`);
      if (!el || !el.value.trim()) missing.push(def.label);
    });
    step.imageFields.forEach(key => {
      const def = getImageDef(key);
      if (!def || !def.required) return;
      if (!uploadedImages[key]) missing.push(def.label);
    });
    if (missing.length) { showToast('请填写：' + missing.join('、')); return false; }
    return true;
  };
  const updateStepper = () => {
    const steps = document.querySelectorAll('.stepper .step');
    const lines = document.querySelectorAll('.stepper .step-line');
    steps.forEach((s, i) => {
      s.classList.remove('active', 'done');
      if (i < currentStep) s.classList.add('done');
      else if (i === currentStep) s.classList.add('active');
    });
    lines.forEach((l, i) => { l.classList.toggle('done', i < currentStep); });
  };
  window.changeStep = (delta) => {
    const next = currentStep + delta;
    if (delta > 0 && !validateStep(currentStep)) return;
    if (next < 0 || next >= TOTAL_STEPS) return;
    currentStep = next;
    updateStepper();
    renderCurrentStep();
    document.getElementById('prevBtn').style.display = currentStep > 0 ? '' : 'none';
    document.getElementById('nextBtn').style.display = currentStep < TOTAL_STEPS - 1 ? '' : 'none';
    document.getElementById('submitBtn').style.display = currentStep === TOTAL_STEPS - 1 ? '' : 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const storedValues = {};
  const getStoredValue = (key) => storedValues[key] || '';
  const escapeAttr = (v) => String(v).replace(/"/g, '&quot;');
  const renderCurrentStep = () => {
    const step = stepDefs[currentStep];
    const container = document.getElementById('mainContainer');
    let html = '';
    if (step.showChannel) {
      html += `<div class="card"><div class="card-header"><div class="card-title"><div class="icon">渠</div>提交渠道</div></div><div class="card-body"><div class="channel-tabs">`;
      html += `<div class="tab ${selectedChannel==='all'?'active':''}" data-channel="all">全部</div>`;
      html += `<div class="tab ${selectedChannel==='wechat'?'active':''}" data-channel="wechat">微信</div>`;
      html += `<div class="tab ${selectedChannel==='alipay'?'active':''}" data-channel="alipay">支付宝</div>`;
      html += `</div></div></div>`;
    }
    if (step.textFields.length) {
      html += `<div class="card"><div class="card-header"><div class="card-title"><div class="icon">${step.icon}</div>${step.title}</div></div><div class="card-body"><div class="form-grid">`;
      step.textFields.forEach(key => {
        const f = getFieldDef(key);
        if (!f) return;
        if (f.type === 'textarea') {
          html += `<div class="field full"><div class="field-label">${f.label}${f.required?'<span class="req">*</span>':''}${f.hint?`<span class="hint-tip">${f.hint}</span>`:''}</div><textarea class="field-input" data-key="${key}" placeholder="请输入${f.label}">${getStoredValue(key)}</textarea></div>`;
        } else {
          html += `<div class="field${step.title==='基本信息'?' full':''}"><div class="field-label">${f.label}${f.required?'<span class="req">*</span>':''}${f.hint?`<span class="hint-tip">${f.hint}</span>`:''}</div><input class="field-input" type="${f.type}" data-key="${key}" placeholder="请输入${f.label}" value="${escapeAttr(getStoredValue(key))}" /></div>`;
        }
      });
      html += `</div></div></div>`;
    }
    if (step.imageFields.length) {
      html += `<div class="card"><div class="card-header"><div class="card-title"><div class="icon">${step.icon}</div>${step.title}</div></div><div class="card-body"><div class="upload-grid">`;
      step.imageFields.forEach(key => {
        const f = getImageDef(key);
        const hasImg = !!uploadedImages[key];
        html += `<div class="upload-item"><div class="upload-label">${f.label}${f.required?'<span class="req">*</span>':''}<span class="hint">${f.hint}</span></div>`;
        html += `<div class="upload-box ${hasImg?'filled':''}" id="upload-${key}">`;
        if (hasImg) { html += `<img src="${uploadedImages[key]}" /><button type="button" class="upload-remove" data-remove="${key}">×</button>`; }
        else { html += `<div class="upload-placeholder"><div class="icon">📷</div><div class="text">点击上传</div><div class="sub">自动压缩优化</div></div>`; }
        html += `<input type="file" accept="image/*" capture="environment" data-input="${key}" /></div></div>`;
      });
      html += `</div></div></div>`;
    }
    container.innerHTML = html;
    document.querySelectorAll('.channel-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.channel-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        selectedChannel = tab.dataset.channel;
      });
    });
    document.querySelectorAll('[data-input]').forEach(input => {
      input.addEventListener('change', async (e) => {
        const fieldKey = input.dataset.input;
        const file = e.target.files[0];
        if (!file) return;
        showToast('处理中...');
        try {
          uploadedImages[fieldKey] = await compressImage(file);
          renderCurrentStep();
          showToast('上传成功');
        } catch (err) { showToast('图片处理失败'); }
      });
    });
    document.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fieldKey = btn.dataset.remove;
        delete uploadedImages[fieldKey];
        const inputEl = document.querySelector(`[data-input="${fieldKey}"]`);
        if (inputEl) inputEl.value = '';
        renderCurrentStep();
      });
    });
    document.querySelectorAll('[data-key]').forEach(el => {
      el.addEventListener('input', () => { storedValues[el.dataset.key] = el.value; });
    });
  };
  const submitForm = async () => {
    if (!validateStep(currentStep)) return;
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    try {
      const data = { submit_channel: channelMap[selectedChannel] };
      textFields.forEach(f => { data[f.key] = storedValues[f.key] || ''; });
      imageFields.forEach(f => { data[f.key] = uploadedImages[f.key] || null; });
      const { error } = await supabase.from('submissions').insert([data]).select('id');
      if (error) throw new Error(error.message);
      showToast('提交成功！', 2400);
      document.getElementById('submitBar').style.display = 'none';
      document.getElementById('mainContainer').innerHTML = `<div class="success-wrap"><div class="success-icon">✓</div><div class="success-title">信息提交成功</div><div class="success-desc">您的资料已加密保存，我们将尽快审核，如有疑问会联系您</div><div class="success-actions"><button class="again" onclick="location.reload()">再提交一份</button></div></div>`;
      document.getElementById('stepper').style.display = 'none';
    } catch (err) {
      showToast('提交失败：' + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = '提交信息';
    }
  };
  const init = () => {
    document.getElementById('submitBar').style.display = '';
    document.getElementById('submitBtn').addEventListener('click', submitForm);
    updateStepper();
    renderCurrentStep();
  };
  init();
})();
