// Barcha FSM holatlari (Scenes / conversation steps)
module.exports = {
  // HR ro'yxatdan o'tish
  HR_REG_COMPANY: 'hr_reg_company',
  HR_REG_PHONE:   'hr_reg_phone',

  // HR e'lon yaratish
  HR_VAC_TITLE:        'hr_vac_title',
  HR_VAC_COMPANY:      'hr_vac_company',
  HR_VAC_LOCATION:     'hr_vac_location',
  HR_VAC_SALARY:       'hr_vac_salary',
  HR_VAC_WORKTIME:     'hr_vac_worktime',
  HR_VAC_REQUIREMENTS: 'hr_vac_requirements',
  HR_VAC_EXTRA:        'hr_vac_extra',
  HR_VAC_CONFIRM:      'hr_vac_confirm',
  HR_VAC_PAYMENT:      'hr_vac_payment',

  // Nomzod ro'yxatdan o'tish
  CAND_REG_NAME:  'cand_reg_name',
  CAND_REG_PHONE: 'cand_reg_phone',

  // Nomzod ariza
  CAND_APPLY_FILLING: 'cand_apply_filling',
  CAND_APPLY_CONFIRM: 'cand_apply_confirm',
  CAND_APPLY_PAYMENT: 'cand_apply_payment',

  // Admin sozlamalar
  ADMIN_SET_KEY:   'admin_set_key',
  ADMIN_SET_VALUE: 'admin_set_value',
};
