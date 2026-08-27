(function () {
  const SUPABASE_URL = 'https://knykshhjspnfjmqjmqqx.supabase.co';
  const ANON_KEY = 'sb_publishable_PAl2zLGZxfupo_ceCUWEWQ_94HJ0YYv';
  const supabase = window.supabase.createClient(SUPABASE_URL, ANON_KEY);

  // ===== Form data =====
  const channelFieldMap = {
    wechat: ['license', 'bankAccountName', 'bankAccount', 'idCardFront'],
    alipay: ['license', 'legalName', 'idCard', 'bankCard', 'storePhoto'],
    both: ['license', 'legalName', 'idCard', 'idCardFront', 'idCardBack', 'bankAccountName', 'bankAccount', 'bankCard', 'storePhoto', 'indoorPhoto']
  };
  const channelLabels = {
    wechat: '微信支付进件',
    alipay: '支付宝进件',
    both: '双渠道进件（推荐）'
  };

  const stepDefs = [
    {
      title: '基本信息',
      short: '基本',
      icon: '🏢',
      desc: '填写商户基础资料与申请渠道',
      showChannel: true,
      fields: [
        { key: 'mchName', label: '商户名称', required: true, type: 'text', placeholder: '请输入营业执照上的全称' },
        { key: 'shortName', label: '商户简称', required: false, type: 'text', placeholder: '将展示于付款页面，建议2-10个字' },
        { key: 'mcc', label: '经营类目/MCC', required: true, type: 'text', placeholder: '如：餐饮、零售、超市等' },
        { key: 'address', label: '经营地址', required: true, type: 'textarea', placeholder: '请填写详细经营地址，精确到门牌号', full: true }
      ]
    },
    {
      title: '资质证件照片',
      short: '资质',
      icon: '📋',
      desc: '上传营业执照、身份证等资质照片',
      showChannel: false,
      uploads: [
        { key: 'license', label: '营业执照', required: true, hint: '需清晰完整，四角可见' },
        { key: 'idCardFront', label: '身份证人像面', required: 'wechat_both', hint: '微信渠道必填' },
        { key: 'idCardBack', label: '身份证国徽面', required: 'wechat_both', hint: '微信渠道必填' },
        { key: 'idCard', label: '法人身份证（正反面）', required: 'ali_both', hint: '支付宝渠道必填' },
        { key: 'storePhoto', label: '门头照/招牌照', required: 'ali_both', hint: '含清晰招牌与店铺入口' },
        { key: 'indoorPhoto', label: '店内环境照', required: false, hint: '支付宝可选，展示经营环境' }
      ]
    },
    {
      title: '联系人信息',
      short: '联系人',
      icon: '👥',
      desc: '法人及紧急联系人信息',
      showChannel: false,
      fields: [
        { key: 'legalName', label: '法人姓名', required: true, type: 'text', placeholder: '请输入法定代表人姓名' },
        { key: 'legalMobile', label: '法人手机号', required: true, type: 'tel', placeholder: '11位手机号码', prefix: '+86' },
        { key: 'contactName', label: '联系人姓名', required: false, type: 'text', placeholder: '非常法人联系人可选填' },
        { key: 'contactMobile', label: '联系人手机号', required: false, type: 'tel', placeholder: '接收审核结果通知' },
        { key: 'email', label: '联系邮箱', required: false, type: 'email', placeholder: '接收电子凭证与回执', full: true }
      ]
    },
    {
      title: '结算信息',
      short: '结算',
      icon: '💰',
      desc: '填写银行结算账户信息',
      showChannel: false,
      fields: [
        { key: 'bankAccountName', label: '开户名', required: 'wechat_both', type: 'text', placeholder: '与营业执照/身份证一致' },
        { key: 'bankName', label: '开户银行', required: true, type: 'text', placeholder: '如：中国工商银行深圳分行' },
        { key: 'bankAccount', label: '银行账号（微信）', required: 'wechat_both', type: 'text', placeholder: '微信渠道结算卡号' },
        { key: 'bankCard', label: '银行卡号（支付宝）', required: 'ali_both', type: 'text', placeholder: '支付宝渠道结算卡号' },
        { key: 'bankBranch', label: '开户支行', required: false, type: 'text', placeholder: '可选，提高审核成功率', full: true },
        { key: 'remark', label: '备注说明', required: false, type: 'textarea', placeholder: '特殊情况说明（可选）', full: true }
      ]
    },
    {
      title: '确认并提交',
      short: '确认',
      icon: '✓',
      desc: '核对信息无误后提交审核',
      isConfirm: true
    }
  ];

  const form = {
    channel: 'both',
    mchName: '', shortName: '', mcc: '', address: '',
    legalName: '', legalMobile: '', contactName: '', contactMobile: '', email: '',
    bankAccountName: '', bankName: '', bankAccount: '', bankCard: '', bankBranch: '', remark: ''
  };
  const uploads = { license: '', idCardFront: '', idCardBack: '', idCard: '', storePhoto: '', indoorPhoto: '' };
  let currentStep = 0;
  let submitted = false;

  // ===== Helpers =====
  function isFieldRequired(fieldKey) {
    // channel-aware required check for fields
    for (const s of stepDefs) {
      if (s.fields) {
        for (const f of s.fields) {
          if (f.key === fieldKey) {
            if (f.required === true) return true;
            if (f.required === 'wechat_both') return form.channel === 'wechat' || form.channel === 'both';
            if (f.required === 'ali_both') return form.channel === 'alipay' || form.channel === 'both';
            return false;
          }
        }
      }
      if (s.uploads) {
        for (const u of s.uploads) {
          if (u.key === fieldKey) {
            if (u.required === true) return true;
            if (u.required === 'wechat_both') return form.channel === 'wechat' || form.channel === 'both';
            if (u.required === 'ali_both') return form.channel === 'alipay' || form.channel === 'both';
            return false;
          }
        }
      }
    }
    return false;
  }

  function isFieldVisibleByChannel(key) {
    if (channelFieldMap.wechat.includes(key) && form.channel === 'wechat') return true;
    if (channelFieldMap.alipay.includes(key) && form.channel === 'alipay') return true;
    if (channelFieldMap.both.includes(key) && form.channel === 'both') return true;
    // non-channel-bound fields are always visible
    if (!Object.values(channelFieldMap).flat().includes(key)) return true;
    return false;
  }

  function toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show';
    setTimeout(() => { el.className = 'toast'; }, 2200);
  }

  function showViewer(src) {
    if (!src) return;
    document.getElementById('viewerImg').src = src;
    document.getElementById('viewer').classList.add('show');
  }
  window.closeViewer = function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    document.getElementById('viewer').classList.remove('show');
  };
  window.viewImage = showViewer;

  function compressImage(file, maxW = 800, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleUpload(input, key) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!/image\//.test(file.type)) { toast('请选择图片文件'); return; }
    try {
      const parent = input.closest('.up-box');
      parent.querySelector('.up-dim')?.remove();
      const dim = document.createElement('div');
      dim.className = 'up-dim';
      dim.textContent = '处理中...';
      parent.appendChild(dim);
      const b64 = await compressImage(file);
      uploads[key] = b64;
      dim.remove();
      // find the target item and refresh
      const itemEl = document.querySelector(`[data-upkey="${key}"]`);
      if (itemEl) {
        itemEl.classList.add('filled');
        itemEl.querySelector('img').src = b64;
      }
    } catch (e) {
      console.error(e);
      toast('图片处理失败');
    }
  }
  window.handleUpload = handleUpload;

  window.deleteUpload = function (key) {
    uploads[key] = '';
    const itemEl = document.querySelector(`[data-upkey="${key}"]`);
    if (itemEl) {
      itemEl.classList.remove('filled');
      itemEl.querySelector('img').removeAttribute('src');
    }
  };

  // ===== Navigation =====
  function validateStep(idx) {
    const step = stepDefs[idx];
    const missing = [];
    if (step.fields) {
      for (const f of step.fields) {
        if (isFieldRequired(f.key) && isFieldVisibleByChannel(f.key) && !String(form[f.key] || '').trim()) {
          missing.push(f.label);
        }
      }
    }
    if (step.uploads) {
      for (const u of step.uploads) {
        if (isFieldRequired(u.key) && isFieldVisibleByChannel(u.key) && !uploads[u.key]) {
          missing.push(u.label);
        }
      }
    }
    return missing;
  }

  window.changeStep = function (delta) {
    const next = currentStep + delta;
    if (next < 0 || next >= stepDefs.length) return;
    if (delta > 0) {
      const miss = validateStep(currentStep);
      if (miss.length > 0) {
        toast('请完善：' + miss.join('、'));
        return;
      }
    }
    currentStep = next;
    refreshUI();
  };

  window.jumpToStep = function (idx) {
    if (idx < 0 || idx >= stepDefs.length) return;
    currentStep = idx;
    refreshUI();
  };

  // ===== Summary builder =====
  function buildSummary() {
    let html = '';
    // 1) Channel
    html += `
      <div class="sum-block">
        <div class="sum-head">
          <div class="tl"><span class="st"></span>申请渠道</div>
          <div class="ed" onclick="event.stopPropagation();jumpToStep(0)">✎ 修改</div>
        </div>
        <div class="sum-body">
          <div class="sum-row"><div class="lbl">进件渠道</div><div class="val">${channelLabels[form.channel] || ''}</div></div>
        </div>
      </div>
    `;
    // 2) Basic / Contact / Settlement
    const sections = [
      { stepIdx: 0, title: '基本信息', icon: '🏢' },
      { stepIdx: 2, title: '联系人信息', icon: '👥' },
      { stepIdx: 3, title: '结算信息', icon: '💰' }
    ];
    for (const sec of sections) {
      const step = stepDefs[sec.stepIdx];
      const rows = (step.fields || []).map(f => {
        const visible = isFieldVisibleByChannel(f.key);
        const required = isFieldRequired(f.key);
        if (!visible) return '';
        const v = String(form[f.key] || '');
        const miss = required && !v;
        return `<div class="sum-row ${miss ? 'miss' : ''}"><div class="lbl">${f.label}</div><div class="val">${v ? v.replace(/\n/g, '<br>') : ''}</div></div>`;
      }).join('');
      if (!rows.trim()) continue;
      html += `
        <div class="sum-block">
          <div class="sum-head" onclick="jumpToStep(${sec.stepIdx})">
            <div class="tl"><span class="st"></span>${sec.icon} ${sec.title}</div>
            <div class="ed" onclick="event.stopPropagation();jumpToStep(${sec.stepIdx})">✎ 修改</div>
          </div>
          <div class="sum-body">
            <div class="sum-grid">${rows}</div>
          </div>
        </div>
      `;
    }
    // 3) Images
    const upStep = stepDefs[1];
    const imgRows = (upStep.uploads || []).map(u => {
      const visible = isFieldVisibleByChannel(u.key);
      const required = isFieldRequired(u.key);
      if (!visible) return '';
      const b64 = uploads[u.key];
      const miss = required && !b64;
      return `
        <div class="sum-img ${miss ? 'miss' : ''}">
          <div class="il">${u.label}${required ? ' *' : ''}</div>
          <div class="iv">
            ${b64 ? `<img src="${b64}" onclick="event.stopPropagation();showViewer(src)">` : `<div class="na" style="${miss ? 'color:#FF8A00;font-weight:500' : ''}">${miss ? '缺失，需上传' : '未上传（非必填）'}</div>`}
          </div>
        </div>
      `;
    }).join('');
    if (imgRows.trim()) {
      html += `
        <div class="sum-block">
          <div class="sum-head" onclick="jumpToStep(1)">
            <div class="tl"><span class="st"></span>📋 资质照片</div>
            <div class="ed" onclick="event.stopPropagation();jumpToStep(1)">✎ 修改</div>
          </div>
          <div class="sum-body">
            <div class="sum-images">${imgRows}</div>
          </div>
        </div>
      `;
    }
    return html;
  }

  // ===== Step rendering =====
  const storedValues = {};
  const getStoredValue = (key) => storedValues[key] || '';
  const escapeAttr = (v) => String(v).replace(/"/g, '&quot;');

  const renderCurrentStep = () => {
    const step = stepDefs[currentStep];
    const container = document.getElementById('mainContainer');

    // Confirmation step
    if (step.isConfirm) {
      container.innerHTML = `
        <div class="card">
          <div class="card-head">
            <div class="title-wrap">
              <div class="ico">${step.icon}</div>
              <div>
                <div class="tt">${step.title}</div>
                <div class="sb">${step.desc}</div>
              </div>
            </div>
            <div class="tag">最后一步</div>
          </div>
          <div class="card-body">
            ${buildSummary()}
            <div style="background: var(--primary-soft); border: 1px solid var(--primary-border); border-radius: 10px; padding: 12px 14px; display: flex; gap: 10px; align-items: flex-start; margin-top: 4px;">
              <div style="font-size:15px;">🛡️</div>
              <div style="font-size:12.5px; color: var(--text-2); line-height: 1.65;">
                <b style="color: var(--primary); font-weight:600;">隐私与安全：</b>提交后，您的敏感信息（身份证、银行账号）将进行加密存储，仅授权审核人员可查看，绝不外泄。
                如有疑问，可在管理后台联系客服或 <a href="javascript:jumpToStep(0)" style="color: var(--primary);font-weight:500;text-decoration:none;">返回修改</a>。
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Regular step with channel tabs
    let html = '';
    if (step.showChannel) {
      html += `
        <div class="card">
          <div class="card-head">
            <div class="title-wrap">
              <div class="ico">📡</div>
              <div>
                <div class="tt">提交渠道</div>
                <div class="sb">选择您需要开通的渠道，将根据选择展示必填字段</div>
              </div>
            </div>
            <div class="tag">必选</div>
          </div>
          <div class="card-body">
            <div class="ch-wrap">
              <div class="ch-tabs">
                <div class="ch-tab ${form.channel === 'wechat' ? 'active' : ''}" onclick="setChannel('wechat')">💚 微信支付</div>
                <div class="ch-tab ali ${form.channel === 'alipay' ? 'active' : ''}" onclick="setChannel('alipay')">💙 支付宝</div>
                <div class="ch-tab ${form.channel === 'both' ? 'active' : ''}" onclick="setChannel('both')">✅ 双渠道（推荐）</div>
              </div>
              <div class="ch-hint">
                <b>说明：</b>双渠道进件只需填写一次资料，统一审核，<br>可同时开通微信与支付宝收款，费率最低 0.2%。
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Render main card with fields/uploads
    html += `<div class="card"><div class="card-head"><div class="title-wrap"><div class="ico">${step.icon}</div><div><div class="tt">${step.title}</div><div class="sb">${step.desc}</div></div></div></div><div class="card-body">`;

    if (step.fields) {
      html += `<div class="form-grid">`;
      for (const f of step.fields) {
        const visible = isFieldVisibleByChannel(f.key);
        const required = isFieldRequired(f.key);
        const val = escapeAttr(form[f.key] || '');
        const cls = ['field', f.full ? 'full' : '', visible ? '' : 'dim'].filter(Boolean).join(' ');
        html += `
          <div class="${cls}" data-fkey="${f.key}">
            <div class="field-label">
              <span>${f.label}</span>${required ? '<span class="req">*</span>' : ''}
              ${f.uploadHint ? `<span class="ft">${f.uploadHint}</span>` : ''}
            </div>
            <div class="field-wrap">
              ${f.prefix ? `<span class="pre">${f.prefix}</span>` : ''}
              ${f.type === 'textarea'
                ? `<textarea class="field-input" placeholder="${escapeAttr(f.placeholder || '')}" data-input="${f.key}">${String(form[f.key] || '')}</textarea>`
                : `<input class="field-input" type="${f.type || 'text'}" placeholder="${escapeAttr(f.placeholder || '')}" value="${val}" data-input="${f.key}">`}
              <div class="field-focus-line"></div>
            </div>
          </div>
        `;
      }
      html += `</div>`;
    }

    if (step.uploads) {
      html += `<div class="up-grid">`;
      for (const u of step.uploads) {
        const visible = isFieldVisibleByChannel(u.key);
        const required = isFieldRequired(u.key);
        const filled = uploads[u.key] ? 'filled' : '';
        const imgSrc = uploads[u.key] || '';
        const hintHtml = u.hint ? `<span class="h">· ${u.hint}</span>` : '';
        const dimHtml = visible ? '' : '<div class="up-dim">当前渠道无需此项</div>';
        html += `
          <div class="up-item" style="${visible ? '' : 'opacity:.5'}">
            <div class="up-label">${u.label}${required ? '<span class="req">*</span>' : ''}${hintHtml}</div>
            <div class="up-box ${filled}" data-upkey="${u.key}">
              ${filled ? `
                <img src="${imgSrc}" onclick="showViewer(src)">
                <div class="up-act">
                  <button class="up-btn" title="预览" onclick="event.stopPropagation();showViewer(this.closest('.up-box').querySelector('img').src)">🔍</button>
                  <button class="up-btn del" title="删除" onclick="event.stopPropagation();deleteUpload('${u.key}')">✕</button>
                </div>` : `
                <div class="up-ph">
                  <div class="cam">📷</div>
                  <div class="t">点击上传</div>
                  <div class="s">支持 JPG/PNG · 自动压缩</div>
                </div>`}
              <input type="file" accept="image/*" onchange="handleUpload(this, '${u.key}')">
              ${dimHtml}
            </div>
          </div>
        `;
      }
      html += `</div>`;
    }

    html += `</div></div>`;
    container.innerHTML = html;

    // Bind input listeners (after innerHTML)
    container.querySelectorAll('[data-input]').forEach(el => {
      el.addEventListener('input', () => {
        const key = el.getAttribute('data-input');
        form[key] = el.value;
        storedValues[key] = el.value;
      });
    });
  };

  window.setChannel = function (ch) {
    form.channel = ch;
    // 同步顶部 tabs
    document.querySelectorAll('.ch-tab').forEach(t => t.classList.remove('active'));
    const allTabs = document.querySelectorAll('.ch-tab');
    if (ch === 'wechat' && allTabs[0]) allTabs[0].classList.add('active');
    if (ch === 'alipay' && allTabs[1]) allTabs[1].classList.add('active');
    if (ch === 'both' && allTabs[2]) allTabs[2].classList.add('active');
    renderCurrentStep();
  };

  // ===== Progress & Sidebar =====
  function calcProgressPct() {
    let total = 0, done = 0;
    for (const s of stepDefs) {
      if (s.fields) for (const f of s.fields) {
        if (!isFieldVisibleByChannel(f.key)) continue;
        total++;
        if (String(form[f.key] || '').trim()) done++;
      }
      if (s.uploads) for (const u of s.uploads) {
        if (!isFieldVisibleByChannel(u.key)) continue;
        if (!isFieldRequired(u.key) && !uploads[u.key]) continue; // optional skipped
        total++;
        if (uploads[u.key]) done++;
      }
    }
    return total === 0 ? 100 : Math.round(done / total * 100);
  }

  function renderSidebar() {
    const sb = document.getElementById('sbSteps');
    const pct = calcProgressPct();
    let html = '';
    stepDefs.forEach((s, i) => {
      const cls = ['sb-step', i < currentStep ? 'done' : '', i === currentStep ? 'active' : ''].filter(Boolean).join(' ');
      const sub = i < currentStep ? '✓ 已完成' : (i === currentStep ? '当前步骤' : '待填写');
      const label = i < currentStep ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="#fff"><path d="M9 16.2l-3.5-3.5L4 14.2 9 19 20 8l-1.4-1.4L9 16.2z"/></svg>' : String(i + 1);
      html += `<div class="${cls}" onclick="jumpToStep(${i})">
        <div class="sb-icon">${label}</div>
        <div class="sb-info"><div class="sb-label">${s.short} · ${s.title}</div><div class="sb-sub">${sub}</div></div>
      </div>`;
    });
    sb.innerHTML = html;
    document.getElementById('progFill').style.width = pct + '%';
    document.getElementById('progPct').textContent = pct + '%';
  }

  function renderMobileStepper() {
    const ms = document.getElementById('mSteps');
    ms.querySelectorAll('.m-line').forEach((l, i) => {
      l.classList.toggle('done', i < currentStep);
    });
    ms.querySelectorAll('.m-stp').forEach((el, i) => {
      el.classList.toggle('active', i === currentStep);
      el.classList.toggle('done', i < currentStep);
      el.querySelector('.ic').textContent = i < currentStep ? '✓' : String(i + 1);
    });
    const pct = calcProgressPct();
    document.getElementById('mPbFill').style.width = Math.max(20, pct) + '%';
    document.getElementById('mCurStep').textContent = String(currentStep + 1);
    document.getElementById('mTotStep').textContent = String(stepDefs.length);
  }

  function renderSubmitBar() {
    const bar = document.getElementById('submitBar');
    const last = stepDefs.length - 1;
    const pct = calcProgressPct();
    bar.style.display = 'flex';
    document.getElementById('prevBtn').style.display = currentStep > 0 ? 'inline-flex' : 'none';
    const isConfirm = stepDefs[currentStep].isConfirm;
    document.getElementById('nextBtn').style.display = isConfirm ? 'none' : 'inline-flex';
    document.getElementById('submitBtn').style.display = isConfirm ? 'inline-flex' : 'none';
    const missing = validateStep(currentStep);
    const canProceed = missing.length === 0;
    const btn = document.getElementById(isConfirm ? 'submitBtn' : 'nextBtn');
    if (isConfirm) {
      const confirmMissing = [];
      for (let i = 0; i < stepDefs.length - 1; i++) confirmMissing.push(...validateStep(i));
      btn.disabled = confirmMissing.length > 0;
      btn.textContent = confirmMissing.length > 0
        ? `✓ 还有 ${confirmMissing.length} 项待完善`
        : (pct >= 99 ? '✓ 确认提交并完成' : `✓ 确认提交 (${pct}%)`);
    } else {
      btn.disabled = !canProceed;
      btn.textContent = canProceed ? '下一步 →' : `下一步 (${missing.length})`;
    }
  }

  function refreshUI() {
    renderCurrentStep();
    renderSidebar();
    renderMobileStepper();
    renderSubmitBar();
    // scroll to top gently
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.refreshUI = refreshUI;

  // ===== Submit =====
  window.submitForm = async function () {
    if (submitted) return;
    // validate all steps
    const allMissing = [];
    for (let i = 0; i < stepDefs.length - 1; i++) allMissing.push(...validateStep(i));
    if (allMissing.length > 0) {
      toast('还有必填项：' + allMissing.slice(0, 3).join('、') + (allMissing.length > 3 ? ' 等' : ''));
      return;
    }
    submitted = true;
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = '提交中，请稍候...';
    try {
      const payload = {
        channel: form.channel,
        // Basic
        mch_name: form.mchName, short_name: form.shortName, mcc: form.mcc, address: form.address,
        // Contact
        legal_name: form.legalName, legal_mobile: form.legalMobile,
        contact_name: form.contactName, contact_mobile: form.contactMobile, email: form.email,
        // Settlement
        bank_account_name: form.bankAccountName, bank_name: form.bankName,
        bank_account: form.bankAccount, bank_card: form.bankCard,
        bank_branch: form.bankBranch, remark: form.remark,
        // Images
        img_license: uploads.license, img_idcard_front: uploads.idCardFront,
        img_idcard_back: uploads.idCardBack, img_idcard: uploads.idCard,
        img_store: uploads.storePhoto, img_indoor: uploads.indoorPhoto,
        status: '待审核'
      };
      const { data, error } = await supabase.from('submissions').insert([payload]).select();
      if (error) throw error;
      const row = (data && data[0]) || {};
      const id = row.id || '';
      // Render success
      document.getElementById('submitBar').style.display = 'none';
      document.getElementById('mainContainer').innerHTML = `
        <div class="success-wrap">
          <div class="success-icon">✅</div>
          <div class="success-title">提交成功，等待审核</div>
          <div class="success-desc">我们已收到您的进件资料，通常 1-3 个工作日完成审核</div>
          <div class="success-desc">结果将通过短信通知联系人手机号</div>
          <div class="info-grid">
            <div class="r"><div class="lbl">进件单号</div><div class="val">${id || '已生成'}</div></div>
            <div class="r"><div class="lbl">申请渠道</div><div class="val">${channelLabels[form.channel] || ''}</div></div>
            <div class="r"><div class="lbl">商户名称</div><div class="val">${form.mchName}</div></div>
            <div class="r"><div class="lbl">提交时间</div><div class="val">${new Date().toLocaleString('zh-CN')}</div></div>
          </div>
          <div class="success-next">
            <button class="bk" onclick="location.reload()">再填写一单</button>
            <button class="ok" onclick="location.href='admin.html'">查看管理后台 →</button>
          </div>
        </div>
      `;
    } catch (e) {
      console.error(e);
      toast('提交失败：' + (e.message || '请稍后重试'));
      submitted = false;
      btn.disabled = false;
      btn.textContent = '✓ 确认提交并完成';
    }
  };

  // ===== Init =====
  function init() {
    refreshUI();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
