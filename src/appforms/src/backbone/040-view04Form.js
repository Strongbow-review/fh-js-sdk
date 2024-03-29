var FormView = BaseView.extend({
  "pageNum": 0,
  "pageCount": 0,
  "pageViews": [],
  "submission": null,
  "fieldValue": [],
  templates: {
    formLogo: '<div class="fh_appform_logo_container" style="text-align:center;"><div class="fh_appform_logo"></div></div>',
    formTitle: '<div class="fh_appform_form_title"><%= title %></div>',
    formContainer: '<div id="fh_appform_container" class="fh_appform_form_area fh_appform_container"></div>',
    buttons: '<div id="fh_appform_navigation_buttons" class="fh_appform_button_bar"><button class="fh_appform_button_saveDraft fh_appform_hidden fh_appform_button_main fh_appform_button_action">Save Draft</button><button class="fh_appform_button_previous fh_appform_hidden fh_appform_button_default">Previous</button><button class="fh_appform_button_next fh_appform_hidden fh_appform_button_default">Next</button><button class="fh_appform_button_submit fh_appform_hidden fh_appform_button_action">Submit</button></div>'
  },
  events: {},
  elementNames: {
    formContainer: "#fh_appform_container"
  },

  initialize: function() {
    var self = this;
    _.bindAll(this, "checkRules", "onValidateError");
    this.$el = this.options.parentEl;
    this.fieldModels = [];
    this.pageViewStatus = {};
    this.$el.empty();
  },
  loadForm: function(params, cb) {
    var self = this;

    if (params.formId) {
      self.onLoad();
      $fh.forms.getForm(params, function(err, form) {
        if (err) {
          throw (err.body);
        }
        self.form = form;
        self.params = params;
        self.initWithForm(form, params);
        cb();
      });
    } else if (params.form) {
      self.form = params.form;
      self.params = params;
      self.initWithForm(params.form, params);
      cb();
    }
  },
  readOnly: function() {
    this.readonly = true;
    for (var i = 0; i < this.fieldViews.length; i++) {
      var fieldView = this.fieldViews[i];
      fieldView.$el.find("button,input,textarea,select").attr("disabled", "disabled");
    }
    this.$el.find("button.fh_appform_button_saveDraft").hide();
    this.$el.find(" button.fh_appform_button_submit").hide();
  },
  onValidateError: function(res) {
    var self = this;
    var firstView = null;
    var invalidFieldId = null;
    var invalidPageNum = null;

    //Clear validate errors

    self.fieldViews.forEach(function(v) {
        var fieldId = v.model.getFieldId();
        if(res.hasOwnProperty(fieldId)){
          var result = res[fieldId];
          result.errorMessages = result.errorMessages || [];
          result.fieldErrorMessage = result.fieldErrorMessage || [];
          if (!result.valid) {
            if(invalidFieldId === null){
              invalidFieldId = fieldId;
              invalidPageNum = self.form.getPageNumberByFieldId(invalidFieldId);
            }
            for (var i = 0; i < result.errorMessages.length; i++) {
              if (result.errorMessages[i]) {
                v.setErrorText(i, result.errorMessages[i]);
              }
            }

            for (i = 0; i < result.fieldErrorMessage.length; i++) {
              if (result.fieldErrorMessage[i]) {
                v.setErrorText(i, result.fieldErrorMessage[i]);
              }
            }
          }
        }
    });

    if(invalidFieldId !== null && invalidPageNum !== null){
      var displayedIndex = this.getDisplayIndex(invalidPageNum) + 1;
      this.$el.find("#fh_appform_page_error").html("Unable to submit form. Validation error on page " + displayedIndex);
      this.$el.find("#fh_appform_page_error").show();
    }
  },
  initWithForm: function(form, params) {
    var self = this;
    var pageView;
    self.formId = form.getFormId();

    self.$el.empty();
    self.model = form;

    //Page views are always added before anything else happens, need to render the form title first
    self.$el.append(this.templates.formContainer);
    self.$el.find(this.elementNames.formContainer).append(_.template(this.templates.formLogo, {}));
    self.$el.find(this.elementNames.formContainer).append(_.template(this.templates.formTitle, {
      title: this.model.getName()
    }));

    if (!params.submission) {
      params.submission = self.model.newSubmission();
    }
    self.submission = params.submission;
    self.submission.on("validationerror", self.onValidateError);

    // Init Pages --------------
    var pageModelList = form.getPageModelList();
    var pageViews = [];

    self.steps = new StepsView({
      parentEl: self.$el.find(this.elementNames.formContainer),
      parentView: self,
      model: self.model
    });

    for (var i = 0; i < pageModelList.length; i++) {
      var pageModel = pageModelList[i];
      var pageId = pageModel.getPageId();

      self.pageViewStatus[pageId] = {
        "targetId": pageId,
        "action": "show"
      };

      // get fieldModels
      var list = pageModel.getFieldModelList();
      self.fieldModels = self.fieldModels.concat(list);

      pageView = new PageView({
        model: pageModel,
        parentEl: self.$el.find(this.elementNames.formContainer),
        formView: self
      });
      pageViews.push(pageView);
    }
    var fieldViews = [];
    for (i = 0; i < pageViews.length; i++) {
      pageView = pageViews[i];
      var pageFieldViews = pageView.fieldViews;
      for (var key in pageFieldViews) {
        var fView = pageFieldViews[key];
        fieldViews.push(fView);
        fView.on("checkrules", self.checkRules);
        if (self.readonly) {
          fView.$el.find("input,button,textarea,select").attr("disabled", "disabled");
        }
      }
    }

    self.fieldViews = fieldViews;
    self.pageViews = pageViews;
    self.pageCount = pageViews.length;
  },
  checkRules: function(params) {
    var self = this;
    var submission = self.submission;
    params = params || {};

    function checkSubmissionRules() {
      submission.checkRules(function(err, res) {
        if (err) {
          console.error(err);
        } else {
          var actions = res.actions;
          var targetId;
          for (targetId in actions.pages) {
            self.pageViewStatus[targetId] = actions.pages[targetId];
          }

          var fields = actions.fields;

          for (targetId in fields) {
            self.performRuleAction("field", targetId, fields[targetId]["action"]);
          }
        }
        self.checkPages();
        self.steps.activePageChange(self);
      });
    }

    if (params.initialising) {
      checkSubmissionRules();
    } else {
      self.populateFieldViewsToSubmission(false, function() {
        checkSubmissionRules();
      });
    }
  },
  performRuleAction: function(type, targetId, action) {
    var target = null;
    if (type === "field") {
      target = this.getFieldViewById(targetId);
    }
    if (target === null) {
      console.error("cannot find target with id:" + targetId);
      return;
    }
    switch (action) {
      case "show":
        target.$el.show();
        break;
      case "hide":
        target.$el.hide();
        break;
      default:
        console.error("action not defined:" + action);
    }
  },
  rebindButtons: function() {
    var self = this;
    this.$el.find("button.fh_appform_button_next").unbind().bind("click", function() {
      self.nextPage();
    });

    this.$el.find("button.fh_appform_button_previous").unbind().bind("click", function() {
      self.prevPage();
    });

    this.$el.find("button.fh_appform_button_saveDraft").unbind().bind("click", function() {
      self.saveToDraft();
    });
    this.$el.find("button.fh_appform_button_submit").unbind().bind("click", function() {
      if($fh.forms.config.isStudioMode()){//Studio mode does not submit.
        alert("Please create a project and interact with the form there.");
      } else {
        self.submit();
      }
    });
  },
  setSubmission: function(sub) {
    this.submission = sub;
  },
  getSubmission: function() {
    return this.submission;
  },
  getPageViewById: function(pageId) {
    for (var i = 0; i < this.pageViews.length; i++) {
      var pageView = this.pageViews[i];
      var pId = pageView.model.getPageId();
      if (pId === pageId) {
        return pageView;
      }
    }
    return null;
  },
  getFieldViewById: function(fieldId) {
    for (var i = 0; i < this.fieldViews.length; i++) {
      var fieldView = this.fieldViews[i];
      var pId = fieldView.model.getFieldId();
      if (pId === fieldId) {
        return fieldView;
      }
    }
    return null;
  },
  checkPages: function() {

    var displayedPages = this.getNumDisplayedPages();
    var displayedIndex = this.getDisplayIndex();

    if (displayedIndex === 0 && displayedIndex === displayedPages - 1) {
      this.$el.find(" button.fh_appform_button_previous").addClass("fh_appform_hidden");
      this.$el.find("button.fh_appform_button_next").addClass("fh_appform_hidden");
      this.$el.find("button.fh_appform_button_saveDraft").removeClass("fh_appform_hidden");
      this.$el.find(" button.fh_appform_button_submit").removeClass("fh_appform_hidden");
      this.$el.find(".fh_appform_button_bar button").removeClass('fh_appform_three_button');
      this.$el.find(".fh_appform_button_bar button").addClass('fh_appform_two_button');
    } else if (displayedIndex === 0) {
      this.$el.find(" button.fh_appform_button_previous").addClass("fh_appform_hidden");
      this.$el.find("button.fh_appform_button_next").removeClass("fh_appform_hidden");
      this.$el.find("button.fh_appform_button_saveDraft").removeClass("fh_appform_hidden");
      this.$el.find(" button.fh_appform_button_submit").addClass("fh_appform_hidden");
      this.$el.find(".fh_appform_button_bar button").removeClass('fh_appform_three_button');
      this.$el.find(".fh_appform_button_bar button").addClass('fh_appform_two_button');
    } else if (displayedIndex === displayedPages - 1) {
      this.$el.find(" button.fh_appform_button_previous").removeClass("fh_appform_hidden");
      this.$el.find(" button.fh_appform_button_next").addClass("fh_appform_hidden");
      this.$el.find(" button.fh_appform_button_saveDraft").removeClass("fh_appform_hidden");
      this.$el.find(" button.fh_appform_button_submit").removeClass("fh_appform_hidden");
      this.$el.find(".fh_appform_button_bar button").removeClass('fh_appform_two_button');
      this.$el.find(".fh_appform_button_bar button").addClass('fh_appform_three_button');
    } else {
      this.$el.find(" button.fh_appform_button_previous").removeClass("fh_appform_hidden");
      this.$el.find(" button.fh_appform_button_next").removeClass("fh_appform_hidden");
      this.$el.find(" button.fh_appform_button_saveDraft").removeClass("fh_appform_hidden");
      this.$el.find(" button.fh_appform_button_submit").addClass("fh_appform_hidden");
      this.$el.find(".fh_appform_button_bar button").removeClass('fh_appform_two_button');
      this.$el.find(".fh_appform_button_bar button").addClass('fh_appform_three_button');
    }
    if (this.readonly) {
      this.$el.find("button.fh_appform_button_saveDraft").addClass("fh_appform_hidden");
      this.$el.find(" button.fh_appform_button_submit").addClass("fh_appform_hidden");
    }

  },
  render: function() {
    this.$el.find("#fh_appform_container.fh_appform_form_area").append(this.templates.buttons);
    this.rebindButtons();
    this.pageViews[0].show();
    this.pageNum = 0;
    this.steps.activePageChange(this);
    this.checkRules({
      initialising: false
    });
    return this;
  },
  getNextPageIndex: function(currentPageIndex) {
    var self = this;

    if(pageIndex >= this.pageViews.length){
      return this.pageViews.length -1;
    }

    for (var pageIndex = currentPageIndex + 1; pageIndex < this.pageViews.length; pageIndex += 1) {
      var pageId = this.pageViews[pageIndex].model.getPageId();
      var pageAction = self.pageViewStatus[pageId].action;

      if (pageAction === "show") {
        return pageIndex;
      }
    }
  },
  getPrevPageIndex: function(currentPageIndex) {
    var self = this;
    if(currentPageIndex <= 0){//Can't display pages before 0.
      return 0;
    }

    for (var pageIndex = currentPageIndex - 1; pageIndex >= 0; pageIndex--) {
      var pageId = self.pageViews[pageIndex].model.getPageId();
      var pageAction = self.pageViewStatus[pageId].action;

      if (pageAction === "show") {
        return pageIndex;
      }
    }
  },
  getDisplayIndex: function(pageNum) {
    var self = this;
    var currentIndex = (pageNum === null || typeof(pageNum) === 'undefined') ? this.pageNum: pageNum;

    for (var pageIndex = this.pageNum; pageIndex > 0; pageIndex--) {
      var pageId = this.pageViews[pageIndex].model.getPageId();
      var pageAction = self.pageViewStatus[pageId].action;

      if (pageAction === "hide") {
        currentIndex -= 1;
      }
    }

    return currentIndex;
  },
  getNumDisplayedPages: function() {
    return this.getDisplayedPages().length;
  },
  getDisplayedPages: function() {
    var self = this;
    var displayedPages = [];
    for (var pageIndex = 0; pageIndex < self.pageViews.length; pageIndex++) {
      var pageId = this.pageViews[pageIndex].model.getPageId();
      var pageAction = self.pageViewStatus[pageId].action;

      if (pageAction === "show") {
        displayedPages.push(pageId);
      }
    }

    return displayedPages;
  },
  nextPage: function() {
    this.hideAllPages();
    this.pageNum = this.getNextPageIndex(this.pageNum);
    this.pageViews[this.pageNum].show();
    this.steps.activePageChange(this);
    this.checkPages();
    this.scrollToTop();
  },
  prevPage: function() {
    this.hideAllPages();
    this.pageNum = this.getPrevPageIndex(this.pageNum);
    this.pageViews[this.pageNum].show();
    this.steps.activePageChange(this);
    this.checkPages();
    this.scrollToTop();
  },
  scrollToTop: function(){
    //Positioning the window to the top of the form container
    var containerSize = $(this.elementNames.formContainer).outerHeight();
    if(containerSize > 0){
      containerSize *= -1;
      window.scrollBy(0, containerSize);
    } else {
      window.scrollTo(0, 0);
    }
  },
  backEvent: function(){
    var self = this;
    if(this.pageNum <= 0){ // Already at the first page, exiting the form. Up to the client what to do with this result.
      return false;
    } 
    self.prevPage();
    return true;
  },
  hideAllPages: function() {
    this.pageViews.forEach(function(view) {
      //make sure to use $el when calling jquery func
      view.hide();
    });
  },
  validateForm: function(cb){
    var self = this;
    this.populateFieldViewsToSubmission(function() {
      self.submission.validateSubmission(cb);
    });
  },
  submit: function() {
    var self = this;
    this.populateFieldViewsToSubmission(function() {
      self.submission.submit(function(err, res) {
        if (err) {
          $fh.forms.log.e("Error Submitting Form:", err);
        } else {
          self.submission.upload(function(err, uploadTask) {
            if (err) {
              $fh.forms.log.e("Error Uploading Form:", err);
            }

            self.$el.empty();
          });
        }
      });
    });
  },
  saveToDraft: function() {
    var self = this;
    this.populateFieldViewsToSubmission(function() {
      self.submission.saveDraft(function(err, res) {
        if (err) {
          $fh.forms.log.e(err);
        }
        self.$el.empty();
      });
    });
  },
  populateFieldViewsToSubmission: function(isStore, cb) {
    if (typeof cb === "undefined") {
      cb = isStore;
      isStore = true;
    }
    var submission = this.submission;
    var fieldViews = this.fieldViews;
    var fieldId;
    var tmpObj = [];
    for (var i = 0; i < fieldViews.length; i++) {
      var fieldView = fieldViews[i];
      var val = fieldView.value();
      fieldId = fieldView.model.getFieldId();
      var fieldType = fieldView.model.getType();

      if (fieldType !== "sectionBreak") {
        for (var j = 0; j < val.length; j++) {
          var v = val[j];
          tmpObj.push({
            id: fieldId,
            value: v,
            index: j
          });
        }
      }
    }
    var count = tmpObj.length;
    for (i = 0; i < tmpObj.length; i++) {
      var item = tmpObj[i];
      fieldId = item.id;
      var value = item.value;
      var index = item.index;

      if (value !== null || typeof(value) !== 'undefined') {
        submission.addInputValue({
          fieldId: fieldId,
          value: value,
          index: index,
          isStore: isStore
        }, function(err, res) {
          if (err) {
            console.error(err);
          }
          count--;
          if (count === 0) {
            cb();
          }
        });
      } else {
        $fh.forms.log.e("Input value for fieldId " + fieldId + " was not defined");
        count--;
        if (count === 0) {
          cb();
        }
      }
    }
  },

  setInputValue: function(fieldId, value) {
    var self = this;
    for (var i = 0; i < this.fieldValue.length; i++) {
      var item = this.fieldValue[i];
      if (item.id === fieldId) {
        this.fieldValue.splice(i, 1);
      }
    }
    for (i = 0; i < value.length; i++) {
      var v = value[i];
      this.fieldValue.push({
        id: fieldId,
        value: v
      });
    }
  }
});