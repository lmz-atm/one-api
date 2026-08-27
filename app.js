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
  const storedValues = {};

  // ===== Field definitions =====
  const imageFields = [
    { key: 'business_license_image', label: '营业执照', hint: '彩色照，露出四边', required: true },
    { key: 'idcard_front_image', label: '身份证正面', hint: '清晰无反光', required: true },
    { key: 'idcard_back_image', label: '身份证反面', hint: '清晰无反光', required: true },
    { key: 'storefront_image', label: '门头照', hint: '拍完整门头', required: true },
    { key: 'store_inside_image', label: '店内照', hint: '店内环境', required: true },
    { key: 'mini_avatar_image', label: '小程序头像', hint: '可后续补充', required: false },
    { key: 'special_qualification_image', label: '特殊资质', hint: '如食品经营许可', required: false }
  ];

  const textFields = [
    { key: 'merchant_name', label: '商户名称', type: 'text', required: true, hint: '建议与营业执照一致', channel: 'all', section: 'basic', full: true },
    { key: 'mini_name_wechat', label: '微信小程序名称', type: 'text', required: true, hint: '参考营业执照名称', channel: 'wechat', section: 'basic' },
    { key: 'mini_name_alipay', label: '支付宝小程序名称', type: 'text', required: true, hint: '发布后不能修改', channel: 'alipay', section: 'basic' },
    { key: 'admin_wechat_name', label: '微信·管理员姓名', type: 'text', required: true, channel: 'wechat', section: 'contact' },
    { key: 'admin_wechat_phone', label: '微信·管理员电话', type: 'tel', required: true, channel: 'wechat', section: 'contact' },
    { key: 'admin_wechat_email', label: '微信·管理员邮箱', type: 'email', required: true, channel: 'wechat', section: 'contact' },
    { key: 'admin_alipay_name', label: '支付宝·联系人姓名', type: 'text', required: true, channel: 'alipay', section: 'contact' },
    { key: 'admin_alipay_phone', label: '支付宝·联系人电话', type: 'tel', required: true, channel: 'alipay', section: 'contact' },
    { key: 'admin_alipay_email', label: '支付宝·联系人邮箱', type: 'email', required: true, channel: 'alipay', section: 'contact' },
    { key: 'legal_name', label: '法人姓名', type: 'text', required: true, channel: 'all', section: 'contact' },
    { key: 'legal_wechat_id', label: '法人微信号', type: 'text', required: true, hint: '微信号，非手机号', channel: 'all', section: 'contact' },
    { key: 'phone_primary', label: '商家电话（常用）', type: 'tel', required: true, channel: 'all', section: 'contact' },
    { key: 'phone_backup', label: '商家电话（备用）', type: 'tel', required: true, channel: 'all', section: 'contact' },
    { key: 'special_qualification_note', label: '特殊资质说明', type: 'textarea', required: false, channel: 'all', section: 'contact', full: true },
    { key: 'bank_account', label: '对公账号 / 法人账号', type: 'text', required: true, hint: '企业填对公，个体户填法人卡', channel: 'all', section: 'settlement', full: true },
    { key: 'legal_alipay_account', label: '法人实名认证支付宝', type: 'text', required: true, channel: 'all', section: 'settlement', full: true },
    { key: 'bank_name', label: '开户银行', type: 'text', required: true, channel: 'all', section: 'settlement' },
    { key: 'bank_branch', label: '具体支行', type: 'text', required: true, channel: 'all', section: 'settlement' },
    { key: 'remark', label: '备注信息', type: 'textarea', required: false, channel: 'all', section: 'settlement', full: true }
  ];

  // Determine if field is relevant for selected channel
  const isFieldRelevant = (def) => {
    if (!def.channel || def.channel === 'all') return true;
    if (selectedChannel === 'all') return true;
    return def.channel === selectedChannel;
  };

  const escapeAttr = (v) => String(v || '').replace(/"/g, '&quot;');

  // ===== Image compression =====
  const compressImage = (file, maxWidth = 800, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          if (img.width <= maxWidth && file.size <= 300 * 1024) {
            resolve(e.target.result);
            return;
          }
          const ratio = maxWidth / img.width;
          const canvas = document.createElement('canvas');
          canvas.width = maxWidth;
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ===== Render text fields into a container =====
  const renderTextFields = (containerId, sectionName) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const fields = textFields.filter(f => f.section === sectionName);
    let html = '';
    fields.forEach(f => {
      const relevant = isFieldRelevant(f);
      const dim = relevant ? '' : 'dim';
      const fullCls = f.full ? ' full' : '';
      const reqMark = f.required && relevant ? '<span class="req">*</span>' : (f.required ? '<span style="color:var(--text-4);font-size:11px;">·单渠道免填</span>' : '');
      const hint = f.hint ? '<span class="ft">' + f.hint + '</span>' : '';
      if (f.type === 'textarea') {
        html += '<div class="field' + fullCls + ' ' + dim + '">'
          + '<div class="field-label">' + f.label + reqMark + hint + '</div>'
          + '<div class="field-wrap">'
          + '<textarea class="field-input" data-key="' + f.key + '" placeholder="请输入' + f.label + '">' + escapeAttr(storedValues[f.key]) + '</textarea>'
          + '</div></div>';
      } else {
        html += '<div class="field' + fullCls + ' ' + dim + '">'
          + '<div class="field-label">' + f.label + reqMark + hint + '</div>'
          + '<div class="field-wrap">'
          + '<input class="field-input" type="' + f.type + '" data-key="' + f.key + '" placeholder="请输入' + f.label + '" value="' + escapeAttr(storedValues[f.key]) + '" />'
          + '</div></div>';
      }
    });
    el.innerHTML = html;
  };

  // ===== Render image upload fields =====
  const renderImageFields = () => {
    const el = document.getElementById('fldImages');
    if (!el) return;
    let html = '';
    imageFields.forEach(f => {
      const hasImg = !!uploadedImages[f.key];
      html += '<div class="up-item">'
        + '<div class="up-label">' + f.label + (f.required ? '<span class="req">*</span>' : '') + '<span class="h">' + f.hint + '</span></div>'
        + '<div class="up-box' + (hasImg ? ' filled' : '') + '" data-up="' + f.key + '">';
      if (hasImg) {
        html += '<img src="' + uploadedImages[f.key] + '" onclick="openViewer(event, this.src)" />'
          + '<div class="up-act">'
          + '<button type="button" class="up-btn" title="查看大图" data-view="' + f.key + '">👁</button>'
          + '<button type="button" class="up-btn del" title="删除" data-remove="' + f.key + '">×</button>'
          + '</div>';
      } else {
        html += '<div class="up-ph">'
          + '<div class="cam">📷</div>'
          + '<div class="t">点击上传/拍照</div>'
          + '<div class="s">自动压缩</div>'
          + '</div>';
      }
      html += '<input type="file" accept="image/*" capture="environment" data-input="' + f.key + '" /></div></div>';
    });
    el.innerHTML = html;
  };

  // ===== Render checklist overview =====
  const renderChecklist = () => {
    const el = document.getElementById('clGrid');
    if (!el) return;
    const items = [];
    // Text fields
    textFields.forEach(f => {
      if (!isFieldRelevant(f)) return;
      if (!f.required) return;
      const done = !!String(storedValues[f.key] || '').trim();
      const chTag = f.channel && f.channel !== 'all' ? '<span class="ch-tag">' + channelMap[f.channel] + '</span>' : '';
      items.push({ label: f.label, done, required: true, chTag });
    });
    // Image fields
    imageFields.forEach(f => {
      if (!f.required) return;
      const done = !!uploadedImages[f.key];
      items.push({ label: f.label, done, required: true, chTag: '' });
    });
    // Optional
    const optional = [];
    textFields.forEach(f => {
      if (!isFieldRelevant(f)) return;
      if (f.required) return;
      optional.push(f.label);
    });
    imageFields.forEach(f => {
      if (f.required) return;
      optional.push(f.label);
    });

    let html = '';
    items.forEach(it => {
      html += '<div class="cl-item">'
        + '<div class="cl-dot' + (it.done ? ' done' : '') + '"></div>'
        + '<div class="cl-text' + (it.done ? ' done' : '') + '">' + it.label + (it.required ? '<span class="req">*</span>' : '') + it.chTag + '</div>'
        + '</div>';
    });
    if (optional.length) {
      html += '<div class="cl-item" style="grid-column:1/-1">'
        + '<div class="cl-dot"></div>'
        + '<div class="cl-text">选填：' + optional.join('、') + '</div>'
        + '</div>';
    }
    el.innerHTML = html;
  };

  // ===== Update progress bar =====
  const updateProgress = () => {
    let total = 0;
    let done = 0;
    textFields.forEach(f => {
      if (!f.required) return;
      if (!isFieldRelevant(f)) return;
      total++;
      if (String(storedValues[f.key] || '').trim()) done++;
    });
    imageFields.forEach(f => {
      if (!f.required) return;
      total++;
      if (uploadedImages[f.key]) done++;
    });
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    document.getElementById('tpDone').textContent = done;
    document.getElementById('tpTotal').textContent = total;
    document.getElementById('tpPct').textContent = pct;
    document.getElementById('tpFill').style.width = pct + '%';
    const btn = document.getElementById('submitBtn');
    if (pct === 100) {
      btn.classList.add('ready');
      btn.textContent = '✓ 全部完成，立即提交';
    } else {
      btn.classList.remove('ready');
      btn.textContent = '✓ 提交进件信息';
    }
  };

  // ===== Bind all events =====
  const bindEvents = () => {
    // Channel tabs
    document.querySelectorAll('#chTabs .ch-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#chTabs .ch-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        selectedChannel = tab.dataset.channel;
        // Re-render text fields to dim/show
        renderTextFields('fldBasic', 'basic');
        renderTextFields('fldContact', 'contact');
        renderTextFields('fldSettlement', 'settlement');
        renderChecklist();
        updateProgress();
        bindFieldEvents();
      });
    });

    // Image upload
    document.querySelectorAll('[data-input]').forEach(input => {
      input.addEventListener('change', async (e) => {
        const fieldKey = input.dataset.input;
        const file = e.target.files[0];
        if (!file) return;
        showToast('处理中...');
        try {
          uploadedImages[fieldKey] = await compressImage(file);
          renderImageFields();
          renderChecklist();
          updateProgress();
          bindImageEvents();
          showToast('上传成功');
        } catch (err) {
          showToast('图片处理失败');
        }
      });
    });

    // Image remove
    document.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fieldKey = btn.dataset.remove;
        delete uploadedImages[fieldKey];
        renderImageFields();
        renderChecklist();
        updateProgress();
        bindImageEvents();
      });
    });

    // Image view
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fieldKey = btn.dataset.view;
        const src = uploadedImages[fieldKey];
        if (src) {
          document.getElementById('viewerImg').src = src;
          document.getElementById('viewer').classList.add('show');
        }
      });
    });
  };

  const bindFieldEvents = () => {
    document.querySelectorAll('[data-key]').forEach(el => {
      el.addEventListener('input', () => {
        storedValues[el.dataset.key] = el.value;
        renderChecklist();
        updateProgress();
      });
    });
  };

  const bindImageEvents = () => {
    document.querySelectorAll('[data-input]').forEach(input => {
      input.addEventListener('change', async (e) => {
        const fieldKey = input.dataset.input;
        const file = e.target.files[0];
        if (!file) return;
        showToast('处理中...');
        try {
          uploadedImages[fieldKey] = await compressImage(file);
          renderImageFields();
          renderChecklist();
          updateProgress();
          bindImageEvents();
          showToast('上传成功');
        } catch (err) {
          showToast('图片处理失败');
        }
      });
    });
    document.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fieldKey = btn.dataset.remove;
        delete uploadedImages[fieldKey];
        renderImageFields();
        renderChecklist();
        updateProgress();
        bindImageEvents();
      });
    });
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fieldKey = btn.dataset.view;
        const src = uploadedImages[fieldKey];
        if (src) {
          document.getElementById('viewerImg').src = src;
          document.getElementById('viewer').classList.add('show');
        }
      });
    });
  };

  // ===== Viewer =====
  window.openViewer = (e, src) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const s = src || (e && e.target && e.target.src);
    if (!s) return;
    document.getElementById('viewerImg').src = s;
    document.getElementById('viewer').classList.add('show');
  };
  window.closeViewer = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    document.getElementById('viewer').classList.remove('show');
    document.getElementById('viewerImg').src = '';
  };

  // ===== Submit =====
  window.submitForm = async () => {
    const missing = [];
    textFields.forEach(f => {
      if (!f.required) return;
      if (!isFieldRelevant(f)) return;
      if (!String(storedValues[f.key] || '').trim()) missing.push(f.label);
    });
    imageFields.forEach(f => {
      if (f.required && !uploadedImages[f.key]) missing.push(f.label);
    });
    if (missing.length) {
      showToast('请完成：' + missing.slice(0, 4).join('、') + (missing.length > 4 ? ' 等' : '') + ' 必填项');
      return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    submitBtn.classList.remove('ready');

    try {
      const data = { submit_channel: channelMap[selectedChannel] };
      textFields.forEach(f => { data[f.key] = storedValues[f.key] || ''; });
      imageFields.forEach(f => { data[f.key] = uploadedImages[f.key] || null; });

      const { error } = await supabase.from('submissions').insert([data]).select('id');
      if (error) throw new Error(error.message);

      showToast('提交成功！', 2600);
      document.getElementById('submitBar').style.display = 'none';
      document.getElementById('topProg').style.display = 'none';
      document.querySelector('.security-bar').style.display = 'none';
      document.getElementById('mainContainer').innerHTML =
        '<div class="success-wrap">'
        + '<div class="success-icon">✓</div>'
        + '<div class="success-title">信息提交成功</div>'
        + '<div class="success-desc">您的进件资料已加密保存至服务器</div>'
        + '<div class="success-desc">我们将在 1-3 个工作日内完成审核，如有疑问将通过电话联系您</div>'
        + '<div class="info-grid">'
        + '<div class="r"><div class="lbl">商户名称</div><div class="val">' + escapeAttr(storedValues.merchant_name || '-') + '</div></div>'
        + '<div class="r"><div class="lbl">开通渠道</div><div class="val">' + channelMap[selectedChannel] + '</div></div>'
        + '<div class="r"><div class="lbl">法人姓名</div><div class="val">' + escapeAttr(storedValues.legal_name || '-') + '</div></div>'
        + '<div class="r"><div class="lbl">联系电话</div><div class="val">' + escapeAttr(storedValues.phone_primary || '-') + '</div></div>'
        + '</div>'
        + '<div class="success-next">'
        + '<button class="ok" onclick="location.reload()">📝 再提交一份</button>'
        + '<button class="bk" onclick="location.href=\'admin.html\'">📊 查看后台</button>'
        + '</div>'
        + '</div>';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showToast('提交失败：' + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = '✓ 提交进件信息';
    }
  };

  // ===== Init =====
  const init = () => {
    renderTextFields('fldBasic', 'basic');
    renderTextFields('fldContact', 'contact');
    renderTextFields('fldSettlement', 'settlement');
    renderImageFields();
    renderChecklist();
    updateProgress();
    bindEvents();
    bindFieldEvents();
  };

  init();
})();
