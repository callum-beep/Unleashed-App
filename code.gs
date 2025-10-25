// ===============================================================
// 🔐 GLOBAL API CREDENTIALS
// ===============================================================
const API_ID   = '017f4e23-867e-4d9a-8d7b-3fd4e4ac8abe';
const API_KEY  = 'jgrsef5CsuP67zVBzEnZy0s4R7knG9rWTp3kbzCFQIYHKipxNhGH4UQkmkA0LcRMvGAg0FggyarV5gdbcXBOQ==';
const CLIENT_TYPE = 'GoogleAppsScript'; // Consistent client-type

// ===============================================================
// 🔧 HELPERS
// ===============================================================
function logInfo(msg){ try { Logger.log(String(msg)); } catch(_) {} }

// HMAC-SHA256 signature for Unleashed API (sorted query)
// Accepts an array of "k=v" parts OR a single "a=1&b=2" string.
function getUnleashedSignature(paramsArray, apiKey) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('API_KEY missing/invalid in Code.gs.');
  }
  if (!Array.isArray(paramsArray)) {
    if (typeof paramsArray === 'string') {
      paramsArray = paramsArray.split('&').map(function(p){ return p.trim(); }).filter(Boolean);
    } else {
      paramsArray = [];
    }
  }
  var sortedQuery = paramsArray.slice().sort().join('&');
  var sigBytes = Utilities.computeHmacSha256Signature(sortedQuery, apiKey);
  return Utilities.base64Encode(sigBytes);
}

// Formats /Date(1678886400000)/ → dd/MM/yyyy
function formatDate(jsonDate) {
  if (!jsonDate) return '';
  var ts = parseInt(String(jsonDate).replace(/\D/g, ''), 10);
  if (isNaN(ts)) return '';
  return Utilities.formatDate(new Date(ts), Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

// Date → 'YYYY-MM-DD'
function formatAPIDate(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''; }

function escapeHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ===============================================================
// 🆕 CREATE ORDER FUNCTIONS (DEBUG VERSION)
// ===============================================================

// Search customers by name/code - DEBUG VERSION
function searchCustomers(query) {
  Logger.log('=== CUSTOMER SEARCH STARTED ===');
  Logger.log('Search query: "' + query + '"');
  
  if (!query || query.trim().length < 2) {
    Logger.log('Query too short, returning empty');
    return { ok: true, items: [] };
  }
  
  var searchTerm = query.trim().toLowerCase();
  Logger.log('Searching for: "' + searchTerm + '"');
  
  // Get ALL customers and filter client-side (like updateSalesOrders does)
  var params = [
    'pageSize=200',
    'page=1'
  ];
  
  var url = 'https://api.unleashedsoftware.com/Customers?' + params.join('&');
  Logger.log('API URL: ' + url);
  
  var sig = getUnleashedSignature(params, API_KEY);
  var headers = {
    'api-auth-id': API_ID,
    'api-auth-signature': sig,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'client-type': CLIENT_TYPE
  };
  
  try {
    var resp = UrlFetchApp.fetch(url, {method: 'get', headers: headers, muteHttpExceptions: true});
    var responseCode = resp.getResponseCode();
    var responseText = resp.getContentText();
    
    Logger.log('Response Code: ' + responseCode);
    
    if (responseCode === 200) {
      var data = JSON.parse(responseText);
      Logger.log('Total customers found: ' + (data.Items ? data.Items.length : 0));
      
      // Filter customers client-side based on search term
      var filteredCustomers = (data.Items || []).filter(function(customer) {
        var customerName = (customer.CustomerName || '').toLowerCase();
        var customerCode = (customer.CustomerCode || '').toLowerCase();
        return customerName.includes(searchTerm) || customerCode.includes(searchTerm);
      });
      
      Logger.log('Filtered customers: ' + filteredCustomers.length);
      
      var customers = filteredCustomers.map(function(customer) {
        return {
          CustomerCode: customer.CustomerCode || '',
          CustomerName: customer.CustomerName || '',
          Guid: customer.Guid || ''
        };
      });
      
      Logger.log('Returning customers: ' + JSON.stringify(customers));
      return { ok: true, items: customers };
    } else {
      Logger.log('API Error: ' + responseCode + ' - ' + responseText);
      return { ok: false, error: 'API error: ' + responseCode };
    }
  } catch (e) {
    Logger.log('Exception: ' + e.toString());
    return { ok: false, error: 'Failed to search customers: ' + e.message };
  }
}

// Search products by description/code - DEBUG VERSION
function searchProducts(query) {
  Logger.log('=== PRODUCT SEARCH STARTED ===');
  Logger.log('Search query: "' + query + '"');
  
  if (!query || query.trim().length < 2) {
    Logger.log('Query too short, returning empty');
    return { ok: true, items: [] };
  }
  
  var searchTerm = query.trim().toLowerCase();
  Logger.log('Searching for: "' + searchTerm + '"');
  
  // Get ALL products and filter client-side
  var params = [
    'pageSize=200',
    'page=1'
  ];
  
  var url = 'https://api.unleashedsoftware.com/Products?' + params.join('&');
  Logger.log('API URL: ' + url);
  
  var sig = getUnleashedSignature(params, API_KEY);
  var headers = {
    'api-auth-id': API_ID,
    'api-auth-signature': sig,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'client-type': CLIENT_TYPE
  };
  
  try {
    var resp = UrlFetchApp.fetch(url, {method: 'get', headers: headers, muteHttpExceptions: true});
    var responseCode = resp.getResponseCode();
    var responseText = resp.getContentText();
    
    Logger.log('Response Code: ' + responseCode);
    
    if (responseCode === 200) {
      var data = JSON.parse(responseText);
      Logger.log('Total products found: ' + (data.Items ? data.Items.length : 0));
      
      // Filter products client-side based on search term
      var filteredProducts = (data.Items || []).filter(function(product) {
        var productDescription = (product.ProductDescription || '').toLowerCase();
        var productCode = (product.ProductCode || '').toLowerCase();
        return productDescription.includes(searchTerm) || productCode.includes(searchTerm);
      });
      
      Logger.log('Filtered products: ' + filteredProducts.length);
      
      var products = filteredProducts.map(function(product) {
        return {
          ProductCode: product.ProductCode || '',
          ProductDescription: product.ProductDescription || '',
          Guid: product.Guid || '',
          UnitPrice: 0
        };
      });
      
      Logger.log('Returning products: ' + JSON.stringify(products));
      return { ok: true, items: products };
    } else {
      Logger.log('API Error: ' + responseCode + ' - ' + responseText);
      return { ok: false, error: 'API error: ' + responseCode };
    }
  } catch (e) {
    Logger.log('Exception: ' + e.toString());
    return { ok: false, error: 'Failed to search products: ' + e.message };
  }
}

// Create new parked order in Unleashed
function createParkedOrder(orderData) {
  try {
    // Validate required fields
    if (!orderData.customerCode) {
      return { ok: false, error: 'Customer is required' };
    }
    if (!orderData.orderDate) {
      return { ok: false, error: 'Order date is required' };
    }
    if (!orderData.warehouseCode) {
      return { ok: false, error: 'Warehouse is required' };
    }
    if (!orderData.lineItems || orderData.lineItems.length === 0) {
      return { ok: false, error: 'At least one product is required' };
    }
    
    // Build the Unleashed order object
    var unleashedOrder = {
      CustomerCode: orderData.customerCode,
      OrderDate: orderData.orderDate + 'T00:00:00', // Add time component
      OrderStatus: 'Parked',
      WarehouseCode: orderData.warehouseCode,
      CustomerRef: orderData.customerRef || '',
      Notes: orderData.notes || '',
      SalesOrderLines: orderData.lineItems.map(function(item, index) {
        return {
          LineNumber: index + 1,
          ProductCode: item.productCode,
          OrderQuantity: Number(item.quantity),
          UnitPrice: 0 // Unleashed will apply pricing automatically
        };
      })
    };
    
    Logger.log('Creating order for customer: ' + orderData.customerCode);
    Logger.log('Line items: ' + JSON.stringify(orderData.lineItems));
    
    // POST to Unleashed API
    var params = [];
    var url = 'https://api.unleashedsoftware.com/SalesOrders';
    var sig = getUnleashedSignature(params, API_KEY);
    var headers = {
      'api-auth-id': API_ID,
      'api-auth-signature': sig,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'client-type': CLIENT_TYPE
    };
    
    var options = {
      method: 'post',
      headers: headers,
      payload: JSON.stringify(unleashedOrder),
      muteHttpExceptions: true
    };
    
    var resp = UrlFetchApp.fetch(url, options);
    var responseCode = resp.getResponseCode();
    var responseText = resp.getContentText();
    
    Logger.log('Order Creation Response: ' + responseCode);
    Logger.log('Order Creation Body: ' + responseText);
    
    if (responseCode === 200 || responseCode === 201) {
      var result = JSON.parse(responseText);
      return { 
        ok: true, 
        message: 'Order created successfully as Parked',
        orderNumber: result.OrderNumber,
        orderId: result.Guid
      };
    } else {
      return { 
        ok: false, 
        error: 'Failed to create order: ' + responseCode + ' - ' + responseText 
      };
    }
    
  } catch (e) {
    Logger.log('Order Creation Exception: ' + e.message);
    return { ok: false, error: 'Exception creating order: ' + e.message };
  }
}

// ===============================================================
// 📊 UPDATE SALES ORDERS  → Sheet "Pending orders"
// ===============================================================
function updateSalesOrders() {
  var SHEET_NAME = 'Pending orders';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  // Preserve existing tail values:
  var existing = sheet.getDataRange().getValues();
  var prevHeaders = existing.length ? existing[0].map(function(h){ return String(h||'').trim(); }) : [];
  var tailMap = {};
  var idxOrderPrev = prevHeaders.indexOf('Order Number');
  var idxProdPrev  = prevHeaders.indexOf('Product Description');
  var idxInvIdPrev   = prevHeaders.indexOf('Inv ID');
  var idxBookedPrev  = prevHeaders.indexOf('Booked?');
  var idxShippedPrev = prevHeaders.indexOf('Shipped');
  var idxDonePrev    = prevHeaders.indexOf('Done');

  if (existing.length > 1 && idxOrderPrev > -1 && idxProdPrev > -1) {
    for (var r = 1; r < existing.length; r++) {
      var row = existing[r];
      var key = String(row[idxOrderPrev] || '') + '|' + String(row[idxProdPrev] || '');
      if (!key || key === '|') continue;
      tailMap[key] = {
        invId:   (idxInvIdPrev   > -1 ? String(row[idxInvIdPrev]   || '') : ''),
        booked:  (idxBookedPrev  > -1 ? String(row[idxBookedPrev]  || '') : ''),
        shipped: (idxShippedPrev > -1 ? String(row[idxShippedPrev] || '') : ''),
        done:    (idxDonePrev    > -1 ? String(row[idxDonePrev]    || '') : '')
      };
    }
  }

  // Headers
  var headers = [
    'Order Number','Order Date','Order Status','Customer',
    'Product Description','Quantity','Salesperson','Warehouse','Created By',
    'Inv ID','Booked?','Shipped','Done'
  ];
  sheet.clearContents();
  sheet.getRange(1,1,1,headers.length).setValues([headers]);

  // Time window
  var today = new Date();
  var since = new Date(today); since.setDate(today.getDate() - 60);
  var startDate = formatAPIDate(since), endDate = formatAPIDate(today);

  var statuses = ['Parked','Backordered'];
  var TARGET_WAREHOUSE = 'breath life sciences'; // case-insensitive exact match
  var out = [];

  statuses.forEach(function(status){
    var page = 1, totalPages = 1;
    while (page <= totalPages) {
      var params = [
        'orderEndDate=' + endDate,
        'orderStartDate=' + startDate,
        'orderStatus=' + status,
        'page=' + page,
        'pageSize=100'
      ];
      var url = 'https://api.unleashedsoftware.com/SalesOrders?' + params.join('&');
      var sig = getUnleashedSignature(params, API_KEY);
      var hdrs = {
        'api-auth-id': API_ID,
        'api-auth-signature': sig,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'client-type': CLIENT_TYPE
      };

      var data;
      try {
        var resp = UrlFetchApp.fetch(url, {method:'get', headers: hdrs});
        if (resp.getResponseCode() !== 200) break;
        data = JSON.parse(resp.getContentText());
      } catch (e) { break; }

      var items = data.Items || [];
      totalPages = (data.Pagination && data.Pagination.NumberOfPages) ? data.Pagination.NumberOfPages : 1;

      items.forEach(function(o){
        var warehouse = '';
        if (o.Warehouse) warehouse = o.Warehouse.WarehouseName || o.Warehouse.WarehouseCode || '';
        if (!warehouse || String(warehouse).trim().toLowerCase() !== TARGET_WAREHOUSE) return;

        (o.SalesOrderLines || []).forEach(function(line){
          var orderNo = String(o.OrderNumber || '');
          var prodDesc = (line.Product && line.Product.ProductDescription) ? line.Product.ProductDescription : '';
          var qty = line.OrderQuantity;
          var createdBy = o.CreatedBy || '';
          var statusCap = capitalize(o.OrderStatus);
          var customerName = (o.Customer && o.Customer.CustomerName) ? o.Customer.CustomerName : '';
          var salesperson = (o.SalesPerson && o.SalesPerson.FullName) ? o.SalesPerson.FullName : '';

          // default Inv ID last 4 of order #
          var digits = orderNo.replace(/\D/g,'');
          var defaultInvId = digits ? digits.slice(-4) : '';

          var row = [
            orderNo,
            formatDate(o.OrderDate),
            statusCap,
            customerName,
            prodDesc,
            qty,
            salesperson,
            warehouse,
            createdBy,
            defaultInvId, '', '', '' // will preserve if previous exists
          ];

          var key = orderNo + '|' + prodDesc;
          var keep = tailMap[key];
          if (keep) {
            row[9]  = keep.invId || row[9];
            row[10] = keep.booked;
            row[11] = keep.shipped;
            row[12] = keep.done;
          }
          out.push(row);
        });
      });
      page++;
    }
  });

  if (out.length) {
    sheet.getRange(2,1,out.length,headers.length).setValues(out);
    sheet.getRange(2,1,out.length,headers.length)
         .sort([{column:3,ascending:true},{column:1,ascending:false}]);
  }
  return { ok: true, rows: out.length };
}

// ===============================================================
// 🧾 UPDATE RECENTLY COMPLETED INVOICES  → Sheet "recently completed"
// ===============================================================
function updateRecentInvoices() {
  var SHEET_NAME = 'recently completed';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sheet.clearContents();

  var params = ['invoiceStatus=Completed','page=1','pageSize=100'];
  var url = 'https://api.unleashedsoftware.com/Invoices?' + params.join('&');
  var sig = getUnleashedSignature(params, API_KEY);
  var hdrs = {'api-auth-id': API_ID,'api-auth-signature': sig,'Accept':'application/json','Content-Type':'application/json','client-type': CLIENT_TYPE};

  var data;
  try {
    var resp = UrlFetchApp.fetch(url, {method:'get', headers: hdrs});
    if (resp.getResponseCode() === 200) data = JSON.parse(resp.getContentText());
  } catch (e) {}

  var rows = [];
  ((data && data.Items) ? data.Items : []).forEach(function(inv){
    (inv.InvoiceLines || []).forEach(function(line){
      rows.push([
        inv.InvoiceNumber,
        formatDate(inv.InvoiceDate),
        inv.Customer && inv.Customer.CustomerName ? inv.Customer.CustomerName : '',
        capitalize(inv.InvoiceStatus),
        inv.CreatedBy || '',
        line.Product && line.Product.ProductDescription ? line.Product.ProductDescription : '',
        line.InvoiceQuantity
      ]);
    });
  });

  var headers = ['Invoice #','Invoice Date','Customer','Status','Created By','Product Description','Quantity'];
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
  if (rows.length) sheet.getRange(2,1,rows.length,headers.length).setValues(rows);

  return { ok: true, rows: rows.length };
}

// ===============================================================
// 📧 EXPORT PARKED ROWS & EMAIL  → Sheet "DELIVERY_TODAY"
// ===============================================================
function exportParkedRowsAndEmail() {
  var SOURCE_SHEET = 'Pending orders';
  var OUTPUT_SHEET = 'DELIVERY_TODAY';
  var DELIVERY_EMAIL = 'orders@cannabisalma.com';
  var BRIS_TZ = 'Australia/Brisbane';

  var dateValue = new Date();
  var DATE_LONG = Utilities.formatDate(dateValue, BRIS_TZ, 'EEEE, MMMM dd, yyyy');

  var BLUE_CELL = '#e6f0fb';
  var WHITE_CELL = '#ffffff';

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var src = ss.getSheetByName(SOURCE_SHEET);
  if (!src) return { ok:false, message:'Missing "Pending orders" sheet' };

  var values = src.getDataRange().getValues();
  if (values.length < 2) return { ok:false, message:'No data in "Pending orders"' };

  var headers = values[0].map(function(h){ return String(h || '').trim(); });
  var rows = values.slice(1);

  var find = function(names){
    for (var i=0;i<headers.length;i++){
      var h = headers[i].toLowerCase();
      for (var j=0;j<names.length;j++){
        if (h === names[j].toLowerCase()) return i;
      }
    }
    return -1;
  };

  var colOrderNo = find(['Order Number']);
  var colStatus  = find(['Order Status']);
  var colPharm   = find(['Customer','Name of Pharmacy','Pharmacy','Store','Customer Name']);
  var colProd    = find(['Product Description','Product','Item']);
  var colQty     = find(['Quantity','Qty','Order Quantity']);

  var parked = rows.filter(function(r){ return String(r[colStatus] || '').trim().toLowerCase() === 'parked'; });

  parked.sort(function(a,b){
    var A = String(a[colPharm] || '').toLowerCase();
    var B = String(b[colPharm] || '').toLowerCase();
    if (A !== B) return A.localeCompare(B);
    var Ap = String(a[colProd] || '').toLowerCase();
    var Bp = String(b[colProd] || '').toLowerCase();
    return Ap.localeCompare(Bp);
  });

  // Build A..P (with blanks & last4)
  var blanks3 = ['', '', ''];
  var blanks5 = ['', '', '', '', ''];
  var outRows = parked.map(function(r){
    var order = String(r[colOrderNo] || '');
    var last4 = (order.match(/\d+/g) || ['']).join('').slice(-4);
    return [
      dateValue,          // A: Date object
      r[colPharm] || '',  // B
      blanks3[0], blanks3[1], blanks3[2], // C,D,E
      r[colProd] || '',   // F
      '', '', '',         // G,H,I placeholders
      r[colQty] || '',    // J
      blanks5[0], blanks5[1], blanks5[2], blanks5[3], blanks5[4], // K..O
      last4               // P
    ];
  });

  var out = ss.getSheetByName(OUTPUT_SHEET) || ss.insertSheet(OUTPUT_SHEET);
  out.clearFormats().clearContents();
  if (outRows.length) out.getRange(1,1,outRows.length,16).setValues(outRows);

  // Format column A as "Monday, October 27, 2025"
  out.getRange(1,1,Math.max(outRows.length,1),1).setNumberFormat('dddd, mmmm dd, yyyy');

  // Background colours
  var numRows = Math.max(outRows.length, 1);
  out.getRange(1,1,numRows,16).setBackground(WHITE_CELL);
  out.getRange(1,3,numRows,1).setBackground(BLUE_CELL); // C
  out.getRange(1,5,numRows,1).setBackground(BLUE_CELL); // E
  out.getRange(1,8,numRows,1).setBackground(BLUE_CELL); // H
  out.autoResizeColumns(1, 16);

  if (!outRows.length) return { ok:false, message:'No Parked rows found' };

  // Email HTML
  var blueCols = {3:true, 5:true, 8:true};
  var htmlRows = outRows.map(function(row){
    return '<tr>' + row.map(function(cell, idx){
      var colIndex = idx + 1;
      var bg = blueCols[colIndex] ? BLUE_CELL : '#ffffff';
      var display = (colIndex === 1 && cell instanceof Date)
        ? DATE_LONG
        : escapeHtml(cell);
      return '<td style="border:1px solid #ddd;padding:6px 8px;background:' + bg + ';white-space:nowrap;">' + display + '</td>';
    }).join('') + '</tr>';
  }).join('');

  var html = ''
    + '<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;">'
    + '  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">'
    +       htmlRows
    + '  </table>'
    + '</div>';

  MailApp.sendEmail({
    to: DELIVERY_EMAIL,
    subject: 'Deliveries to book - ' + DATE_LONG,
    htmlBody: html
  });

  return { ok:true, rows: outRows.length, message: 'Emailed ' + outRows.length + ' parked rows' };
}

// ===============================================================
// ✅ COMPLETE INVOICES (backend) — completes only PARKED orders from sheet
// ===============================================================
function completeInvoices() {
  var SHEET = 'Pending orders';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) return { ok:false, message:'Missing "Pending orders" sheet' };

  var data = sh.getDataRange().getValues();
  if (!data || data.length < 2) return { ok:false, message:'No data in "Pending orders"' };

  var headers = data[0].map(function(h){ return String(h||'').trim(); });
  var idxOrder = headers.indexOf('Order Number');
  var idxStatus = headers.indexOf('Order Status');
  if (idxOrder === -1 || idxStatus === -1) return { ok:false, message:'Missing Order Number/Order Status column(s)' };

  // Unique parked order numbers
  var orderSet = {};
  for (var r = 1; r < data.length; r++) {
    var orderNo = String(data[r][idxOrder] || '').trim();
    var status  = String(data[r][idxStatus] || '').trim().toLowerCase();
    if (orderNo && status === 'parked') orderSet[orderNo] = true;
  }
  var orderNumbers = Object.keys(orderSet);
  if (!orderNumbers.length) return { ok:false, message:'No parked orders found' };

  var completed = 0, already = 0, failed = 0;

  for (var i = 0; i < orderNumbers.length; i++) {
    var so = orderNumbers[i];

    // Lookup order by orderNumber to get Guid & status
    var paramsGet = ['orderNumber=' + encodeURIComponent(so)];
    var urlGet = 'https://api.unleashedsoftware.com/SalesOrders?' + paramsGet.join('&');
    var sigGet = getUnleashedSignature(paramsGet, API_KEY);
    var headersGet = {
      'api-auth-id': API_ID,
      'api-auth-signature': sigGet,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'client-type': CLIENT_TYPE
    };

    var orderGuid = null;
    var currentStatus = '';
    try {
      var resp = UrlFetchApp.fetch(urlGet, {method:'get', headers: headersGet});
      if (resp.getResponseCode() !== 200) { failed++; Utilities.sleep(150); continue; }
      var body = JSON.parse(resp.getContentText());
      var item = (body && body.Items && body.Items.length) ? body.Items[0] : null;
      if (!item) { failed++; Utilities.sleep(150); continue; }
      orderGuid = item.Guid || item.GuidId || null;
      currentStatus = String(item.OrderStatus || '').toLowerCase();
    } catch (e) { failed++; Utilities.sleep(150); continue; }

    if (!orderGuid) { failed++; Utilities.sleep(150); continue; }
    if (currentStatus === 'completed') { already++; Utilities.sleep(100); continue; }
    if (currentStatus !== 'parked' && currentStatus !== 'placed' && currentStatus !== 'backordered') {
      failed++; Utilities.sleep(150); continue;
    }

    // Complete: POST /SalesOrders/{Guid}/Complete
    var completeUrl = 'https://api.unleashedsoftware.com/SalesOrders/' + orderGuid + '/Complete';
    var sigPost = getUnleashedSignature([], API_KEY); // no query params
    var headersPost = {
      'api-auth-id': API_ID,
      'api-auth-signature': sigPost,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'client-type': CLIENT_TYPE
    };

    try {
      var respPost = UrlFetchApp.fetch(completeUrl, {method:'post', headers: headersPost, payload: ''});
      var code = respPost.getResponseCode();
      if (code === 200 || code === 204) completed++; else failed++;
    } catch (e2) { failed++; }

    Utilities.sleep(200); // gentle rate-limit
  }

  var summary = 'Completed: ' + completed + ' • Already: ' + already + ' • Failed: ' + failed;
  return { ok:true, message: summary, completed: completed, already: already, failed: failed, orders: orderNumbers };
}

// ===============================================================
// ✅ SHEETS-ONLY CONFIRM WRAPPER — shows the list of order numbers
// ===============================================================
function completeInvoicesConfirm() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Pending orders');
  if (!sh) { ui.alert('Sheet "Pending orders" not found.'); return; }

  var data = sh.getDataRange().getValues();
  if (!data || data.length < 2) { ui.alert('No data in "Pending orders".'); return; }

  var headers = data[0].map(function(h){ return String(h||'').trim(); });
  var idxOrder = headers.indexOf('Order Number');
  var idxStatus = headers.indexOf('Order Status');
  if (idxOrder === -1 || idxStatus === -1) { ui.alert('Missing "Order Number" or "Order Status".'); return; }

  var orderSet = {};
  for (var r = 1; r < data.length; r++) {
    var orderNo = String(data[r][idxOrder] || '').trim();
    var status  = String(data[r][idxStatus] || '').trim().toLowerCase();
    if (orderNo && status === 'parked') orderSet[orderNo] = true;
  }
  var orders = Object.keys(orderSet);
  if (!orders.length) { ui.alert('No PARKED orders found.'); return; }

  // Build confirmation message listing order numbers (truncate if too long)
  var maxShow = 40; // avoid exceeding alert length
  var shown = orders.slice(0, maxShow);
  var more = orders.length > maxShow ? ' … +' + (orders.length - maxShow) + ' more' : '';
  var list = shown.join(', ') + more;

  var res = ui.alert(
    '✅ Complete parked orders',
    'This will COMPLETE order numbers:\n' + list + '\n\nAre you sure?',
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  var result = completeInvoices(); // back-end action
  ui.alert('✅ Complete parked orders', result.message || 'Done.', ui.ButtonSet.OK);
}

// ===============================================================
// 🌐 WEB APP ENTRY (Desktop UI)
// ===============================================================
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('DesktopApp')
    .setTitle('Alma Cannabis Pending Orders');
}

// Ping for UI
function _webPing() { return { ok: true, time: new Date().toISOString() }; }

// ===============================================================
// 📄 DATA for Desktop UI table
// ===============================================================
function appListPendingOrders(options) {
  var opt = options || {};
  var statusFilter = String(opt.status || 'parked').toLowerCase();
  var limit = Math.max(1, Math.min(Number(opt.limit || 1000), 2000));

  var SHEET_NAME = 'Pending orders';
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh) return { headers: [], rows: [] };

  var values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return { headers: values[0] || [], rows: [] };

  var headers = values[0].map(function(h){ return String(h || '').trim(); });
  var idxStatus = headers.indexOf('Order Status');

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row || !row.length) continue;

    if (idxStatus >= 0 && (statusFilter === 'parked' || statusFilter === 'backordered')) {
      var s = String(row[idxStatus] || '').trim().toLowerCase();
      if (s !== statusFilter) continue;
    }
    rows.push(row);
    if (rows.length >= limit) break;
  }

  // Sort like sheet: Status alpha, then Order Date desc
  var idxDate = headers.indexOf('Order Date');
  var idxStatusCol = idxStatus;
  rows.sort(function(a, b){
    var sa = String(a[idxStatusCol] || '').toLowerCase();
    var sb = String(b[idxStatusCol] || '').toLowerCase();
    if (sa !== sb) return sa.localeCompare(sb);
    if (idxDate >= 0) {
      function parseSheetDate(v){
        if (v instanceof Date) return v.getTime();
        var s = String(v || '');
        var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) { return new Date(+m[3], +m[2]-1, +m[1]).getTime(); }
        var t = Date.parse(s);
        return isNaN(t) ? 0 : t;
      }
      return parseSheetDate(b[idxDate]) - parseSheetDate(a[idxDate]);
    }
    return 0;
  });

  return { headers: headers, rows: rows };
}

// ===============================================================
// 📋 SHEETS MENU (safe in Sheets UI; ignored on web)
// ===============================================================
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('🌿 Orders')
      .addItem('📊 Open Operations App (sidebar)','openOperationsApp')
      .addSeparator()
      .addItem('🌱 Update Sales Orders','updateSalesOrders')
      .addItem('🧾 Update Recent Invoices','updateRecentInvoices')
      .addItem('🚚 Send Parked Deliveries Email','exportParkedRowsAndEmail')
      .addItem('✅ Complete invoices','completeInvoicesConfirm') // confirm with list
      .addToUi();
  } catch (_) {}
}

// (Optional) open the same desktop UI in a sidebar (Sheets only)
function openOperationsApp(){
  try {
    var html = HtmlService.createHtmlOutputFromFile('DesktopApp').setTitle('Alma Cannabis Pending Orders');
    SpreadsheetApp.getUi().showSidebar(html);
  } catch(_) {}
}// TEST FUNCTION - Add this to Code.gs temporarily
function testCustomerSearchDirect() {
  var params = [
    'pageSize=200',
    'page=1'
  ];
  
  var url = 'https://api.unleashedsoftware.com/Customers?' + params.join('&');
  var sig = getUnleashedSignature(params, API_KEY);
  
  var headers = {
    'api-auth-id': API_ID,
    'api-auth-signature': sig,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'client-type': CLIENT_TYPE
  };
  
  try {
    var resp = UrlFetchApp.fetch(url, {method: 'get', headers: headers, muteHttpExceptions: true});
    Logger.log('Response Code: ' + resp.getResponseCode());
    Logger.log('Response Body: ' + resp.getContentText());
    
    if (resp.getResponseCode() === 200) {
      var data = JSON.parse(resp.getContentText());
      Logger.log('Number of customers: ' + (data.Items ? data.Items.length : 0));
      
      if (data.Items && data.Items.length > 0) {
        Logger.log('First customer: ' + JSON.stringify(data.Items[0]));
      }
    }
  } catch (e) {
    Logger.log('Error: ' + e.toString());
  }
}function testAllEndpoints() {
  var endpoints = [
    'Customers',
    'Products', 
    'SalesOrders',
    'Warehouses'
  ];
  
  endpoints.forEach(function(endpoint) {
    var params = ['pageSize=1', 'page=1'];
    var url = 'https://api.unleashedsoftware.com/' + endpoint + '?' + params.join('&');
    var sig = getUnleashedSignature(params, API_KEY);
    
    var headers = {
      'api-auth-id': API_ID,
      'api-auth-signature': sig,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'client-type': CLIENT_TYPE
    };
    
    try {
      var resp = UrlFetchApp.fetch(url, {method: 'get', headers: headers, muteHttpExceptions: true});
      Logger.log(endpoint + ': ' + resp.getResponseCode());
    } catch (e) {
      Logger.log(endpoint + ': ERROR - ' + e.toString());
    }
    
    Utilities.sleep(500);
  });
}function testSignatureOrder() {
  // Test 1: No parameters (like your working Complete endpoint)
  var params1 = [];
  var url1 = 'https://api.unleashedsoftware.com/Customers';
  var sig1 = getUnleashedSignature(params1, API_KEY);
  
  var headers1 = {
    'api-auth-id': API_ID,
    'api-auth-signature': sig1,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'client-type': CLIENT_TYPE
  };
  
  try {
    var resp1 = UrlFetchApp.fetch(url1, {method: 'get', headers: headers1, muteHttpExceptions: true});
    Logger.log('No params: ' + resp1.getResponseCode());
    if (resp1.getResponseCode() === 200) {
      Logger.log('SUCCESS! Response: ' + resp1.getContentText().substring(0, 200));
    }
  } catch (e) {
    Logger.log('No params ERROR: ' + e.toString());
  }
}function testWithPageSize() {
  // Match exactly how updateSalesOrders does it
  var params = [
    'pageSize=200',
    'page=1'
  ];
  
  var url = 'https://api.unleashedsoftware.com/Customers?' + params.join('&');
  
  Logger.log('Query string: ' + params.join('&'));
  Logger.log('After sort: ' + params.slice().sort().join('&'));
  
  var sig = getUnleashedSignature(params, API_KEY);
  
  var headers = {
    'api-auth-id': API_ID,
    'api-auth-signature': sig,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'client-type': CLIENT_TYPE
  };
  
  try {
    var resp = UrlFetchApp.fetch(url, {method: 'get', headers: headers, muteHttpExceptions: true});
    Logger.log('With pageSize: ' + resp.getResponseCode());
    if (resp.getResponseCode() === 200) {
      var data = JSON.parse(resp.getContentText());
      Logger.log('Number of customers: ' + (data.Items ? data.Items.length : 0));
    } else {
      Logger.log('Error response: ' + resp.getContentText());
    }
  } catch (e) {
    Logger.log('ERROR: ' + e.toString());
  }
}function testWithDateParams() {
  var today = new Date();
  var since = new Date(today); 
  since.setDate(today.getDate() - 60);
  
  var y = today.getFullYear();
  var m = String(today.getMonth() + 1).padStart(2, '0');
  var d = String(today.getDate()).padStart(2, '0');
  var endDate = y + '-' + m + '-' + d;
  
  y = since.getFullYear();
  m = String(since.getMonth() + 1).padStart(2, '0');
  d = String(since.getDate()).padStart(2, '0');
  var startDate = y + '-' + m + '-' + d;
  
  // Try Customers with date-like parameters
  var params = [
    'modifiedSince=' + startDate,
    'pageSize=200',
    'page=1'
  ];
  
  var url = 'https://api.unleashedsoftware.com/Customers?' + params.join('&');
  Logger.log('URL: ' + url);
  
  var sig = getUnleashedSignature(params, API_KEY);
  
  var headers = {
    'api-auth-id': API_ID,
    'api-auth-signature': sig,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'client-type': CLIENT_TYPE
  };
  
  try {
    var resp = UrlFetchApp.fetch(url, {method: 'get', headers: headers, muteHttpExceptions: true});
    Logger.log('Response: ' + resp.getResponseCode());
    if (resp.getResponseCode() === 200) {
      var data = JSON.parse(resp.getContentText());
      Logger.log('Customers: ' + (data.Items ? data.Items.length : 0));
    } else {
      Logger.log('Error: ' + resp.getContentText());
    }
  } catch (e) {
    Logger.log('Exception: ' + e.toString());
  }
}
