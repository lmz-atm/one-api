(function () {
  const SUPABASE_URL = 'https://knykshhjspnfjmqjmqqx.supabase.co';
  const ANON_KEY = 'sb_publishable_PAl2zLGZxfupo_ceCUWEWQ_94HJ0YYv';
  const supabase = window.supabase.createClient(SUPABASE_URL, ANON_KEY);

  const toast = document.getElementById('toast');
  const showToast = (msg, duration = 2000) => {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  };

  const channelMap = { wechat: '微信', alipay: '支付宝', all: '全部' };
  let selectedChannel = 'all';
  const uploadedImages = {};

  const imageFields = [
    { key: 'business_license_image', label: '营业执照', hint: '彩色照片，必须露出四个边角，确保清晰无反光', required: true },
    { key: 'idcard_front_image', label: '身份证正面', hint: '正面彩色照片，同一背景拍摄，清晰无反光', required: true },
    { key: 'idcard_back_image', label: '身份证反面', hint: '反面彩色照片，同一背景拍摄，清晰无反光', required: true },
    { key: 'storefront_image', label: '门头照', hint: '门头照（拍完整）', required: true },
    { key: 'store_inside_image', label: '店内照', hint: '店内照片', required: true },
    { key: 'mini_avatar_image', label: '小程序头像', hint: '小程序的头像图片', required: false },
    { key: 'special_qualification_image', label: '特殊资质', hint: '如有需提供，如食品经营许可证', required: false }
  ];

  const textFields = [
    { key: 'merchant_name', label: '商户名称', type: 'text', required: true },
    { key: 'admin_wechat_name', label: '微信-超级管理员姓名', type: 'text', required: true },
    { key: 'admin_wechat_phone', label: '微信-超级管理员电话', type: 'tel', required: true },
    { key: 'admin_wechat_email', label: '微信-超级管理员邮箱', type: 'email', required: true },
    { key: 'admin_alipay_name', label: '支付宝-联系人姓名', type: 'text', required: true },
    { key: 'admin_alipay_phone', label: '支付宝-联系人电话', type: 'tel', required: true },
    { key: 'admin_alipay_email', label: '支付宝-联系人邮箱', type: 'email', required: true },
    { key: 'bank_account', label: '对公账号/法人银行账号', type: 'text', required: true, hint: '企业提供对公账号，个体户提供法人银行账号' },
    { key: 'legal_alipay_account', label: '法人实名认证支付宝账号', type: 'text', required: true },
    { key: 'bank_name', label: '开户银行', type: 'text', required: true },
    { key: 'bank_branch', label: '具体支行名称', type: 'text', required: true },
    { key: 'legal_name', label: '法人姓名', type: 'text', required: true },
    { key: 'legal_wechat_id', label: '法人微信号', type: 'text', required: true, hint: '必须是微信号，不是手机号' },
    { key: 'mini_name_wechat', label: '微信小程序名称', type: 'text', required: true, hint: '建议参考营业执照名称或简称' },
    { key: 'mini_name_alipay', label: '支付宝小程序名称', type: 'text', required: true, hint: '发布之后不能修改' },
    { key: 'phone_primary', label: '商家电话（常用）', type: 'tel', required: true },
    { key: 'phone_backup', label: '商家电话（备用）', type: 'tel', required: true },
    { key: 'special_qualification_note', label: '特殊资质说明', type: 'textarea', required: false },
    { key: 'remark', label: '备注', type: 'textarea', required: false }
  ];

  const compressImage = (file, maxWidth = 1024, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          if (img.width <= maxWidth && file.size <= 500 * 1024) {
            resolve(e.target.result);
            return;
          }
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

  const renderForm = () => {
    const container = document.getElementById('mainContainer');
    const uploadHTML = imageFields.map((f) => `
      <div class="section">
        <div class="section-title">${f.label}${f.required ? '<span class="req" style="color:#ff5252;margin-left:4px">*</span>' : ''}</div>
        <div class="section-body">
          <div class="field">
            <div class="section-hint">${f.hint}</div>
            <div class="upload-area" id="upload-${f.key}">
              <div class="placeholder" id="placeholder-${f.key}">
                <span class="icon">📷</span>
                <div>点击/拍照上传</div>
                <div class="tip">自动压缩优化，支持 JPG、PNG</div>
              </div>
              <img id="preview-${f.key}" style="display:none" />
              <button type="button" class="remove-btn" data-remove="${f.key}">×</button>
              <input type="file" accept="image/*" capture="environment" data-input="${f.key}" />
            </div>
          </div>
        </div>
      </div>
    `).join('');

    const textHTML = textFields.map((f) => {
      if (f.type === 'textarea') {
        return `
          <div class="section">
            <div class="section-title">${f.label}</div>
            <div class="section-body">
              <div class="field">
                ${f.hint ? `<div class="section-hint">${f.hint}</div>` : ''}
                <textarea data-key="${f.key}" placeholder="请输入${f.label}"></textarea>
              </div>
            </div>
          </div>`;
      }
      return `
        <div class="section">
          <div class="section-title">${f.label}${f.required ? '<span class="req" style="color:#ff5252;margin-left:4px">*</span>' : ''}</div>
          <div class="section-body">
            <div class="field">
              ${f.hint ? `<div class="section-hint">${f.hint}</div>` : ''}
              <input type="${f.type}" data-key="${f.key}" placeholder="请输入${f.label}" ${f.required ? 'required' : ''} />
            </div>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="section">
        <div class="section-title">提交渠道</div>
        <div class="section-body">
          <div class="channel-tabs">
            <div class="tab active" data-channel="all">全部</div>
            <div class="tab" data-channel="wechat">微信</div>
            <div class="tab" data-channel="alipay">支付宝</div>
          </div>
        </div>
      </div>
      ${uploadHTML}
      ${textHTML}
    `;

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
          const base64 = await compressImage(file);
          uploadedImages[fieldKey] = base64;
          const area = document.getElementById(`upload-${fieldKey}`);
          const placeholder = document.getElementById(`placeholder-${fieldKey}`);
          const preview = document.getElementById(`preview-${fieldKey}`);
          placeholder.style.display = 'none';
          preview.style.display = 'block';
          preview.src = base64;
          area.classList.add('has-image');
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
        const area = document.getElementById(`upload-${fieldKey}`);
        const placeholder = document.getElementById(`placeholder-${fieldKey}`);
        const preview = document.getElementById(`preview-${fieldKey}`);
        placeholder.style.display = 'block';
        preview.style.display = 'none';
        area.classList.remove('has-image');
        area.querySelector('input[type="file"]').value = '';
      });
    });

    document.getElementById('submitBar').style.display = 'block';
    document.getElementById('submitBtn').addEventListener('click', submitForm);
  };

  const submitForm = async () => {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';

    try {
      const data = { submit_channel: channelMap[selectedChannel] };
      textFields.forEach(f => {
        const el = document.querySelector(`[data-key="${f.key}"]`);
        data[f.key] = el ? el.value.trim() : '';
      });
      imageFields.forEach(f => {
        data[f.key] = uploadedImages[f.key] || null;
      });

      const { data: result, error } = await supabase
        .from('submissions')
        .insert([data])
        .select('id');

      if (error) throw new Error(error.message);

      showToast('提交成功！');
      document.getElementById('mainContainer').innerHTML = `
        <div class="success-page">
          <div class="icon">✅</div>
          <h2>提交成功！</h2>
          <p>您的信息已成功提交，感谢您的配合</p>
          <button onclick="location.reload()">再次提交</button>
        </div>
      `;
      document.getElementById('submitBar').style.display = 'none';
    } catch (err) {
      showToast('提交失败：' + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = '提交信息';
    }
  };

  renderForm();
})();
