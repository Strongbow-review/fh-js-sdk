var FieldView = Backbone.View.extend({

    className: 'fh_appform_field_area',
    errMessageContainer: ".fh_appform_field_error_container",
    requiredClassName: "fh_appform_field_required",
    errorClassName: "fh_appform_field_error",
    repeatingClassName: "repeating",
    nonRepeatingClassName: "non_repeating",
    addInputButtonClass: ".fh_appform_addInputBtn",
    removeInputButtonClass: ".fh_appform_removeInputBtn",
    fieldWrapper: '<div class="fh_appform_input_wrapper"></div>',
    input: "<input class='fh_appform_field_input <%= repeatingClassName%>' data-field='<%= fieldId %>' data-index='<%= index %>' value='<%= value %>' type='<%= inputType %>' />",
    inputTemplate: "<div id='wrapper_<%= fieldId %>_<%= index %>'> <div class='fh_appform_field_input_container non_repeating' >  <%= inputHtml %> <div class='fh_appform_field_error_container fh_appform_hidden' ></div></div><br style='clear:both'/>    </div>",
    inputTemplateRepeating: "<div id='wrapper_<%= fieldId %>_<%= index %>' > <div class='<%= required %> fh_appform_field_title fh_appform_field_numbering'> <%=index + 1%>.  </div> <div class='fh_appform_field_input_container repeating' >  <%= inputHtml %> <div class='fh_appform_field_error_container fh_appform_hidden'></div></div><br style='clear:both'/></div>",


    fh_appform_fieldActionBar: "<div class='fh_appform_field_button_bar' ><button class='fh_appform_removeInputBtn special_button fh_appform_button_action'>-</button><button class='special_button fh_appform_addInputBtn fh_appform_button_action'>+</button></div>",
    title: '<label class="fh_appform_field_title <%= required%>"><%= title %> </label>',
    titleRepeating: '<label class="fh_appform_field_title"><%= title %> </label>',
    instructions: '<p class="fh_appform_field_instructions"><%= helpText %></p>',
    events: {
        "change": "contentChanged",
        "blur input,select,textarea": "validate",
        "click .fh_appform_addInputBtn": "onAddInput",
        "click .fh_appform_removeInputBtn": "onRemoveInput"
    },
    onAddInput: function() {
        this.addElement();
        this.checkActionBar();
    },
    onRemoveInput: function() {
        this.removeElement();
        this.checkActionBar();
    },
    checkActionBar: function() {
        var curNum = this.curRepeat;
        var maxRepeat = this.maxRepeat;
        var minRepeat = this.initialRepeat;
        if (curNum < maxRepeat) {
            this.$fh_appform_fieldActionBar.find(this.addInputButtonClass).show();
        } else {
            this.$fh_appform_fieldActionBar.find(this.addInputButtonClass).hide();
        }

        if (curNum > minRepeat) {
            this.$fh_appform_fieldActionBar.find(this.removeInputButtonClass).show();
        } else {
            this.$fh_appform_fieldActionBar.find(this.removeInputButtonClass).hide();
        }
    },
    removeElement: function() {
        var curRepeat = this.curRepeat;
        var lastIndex = curRepeat - 1;
        this.getWrapper(lastIndex).remove();
        this.curRepeat--;
    },
    renderTitle: function() {
        var name = this.model.getName();
        var title = name;
        var template = this.title;

        if (this.model.isRepeating()) {
            template = this.titleRepeating;
        }

        return _.template(template, {
            "title": title,
            "required": this.getFieldRequired(0)
        });
    },
    renderInput: function(index) {
        var fieldId = this.model.getFieldId();
        var type = this.getHTMLInputType();
        var repeatingClassName = this.model.isRepeating() ? this.repeatingClassName : this.nonRepeatingClassName;

        return _.template(this.input, {
            "fieldId": fieldId,
            "index": index,
            "inputType": type,
            "repeatingClassName": repeatingClassName,
            "value":this.model.getDefaultValue()
        });
    },
    getHTMLInputType: function() {
        return this.type || "text";
    },
    /**
    * Repeating fields can have required and non-required repeating inputs depending on the minRepeat and maxRepeat values defined for the field
    **/
    "getFieldRequired": function(index) {
        var required = "";
        if(this.model.isRequired()){
            if(index < this.initialRepeat){
                required = this.requiredClassName;
            } else {

            }
        } else {

        }
        return required;
    },
    renderEle: function(titleHtml, inputHtml, index) {
        var fieldId = this.model.getFieldId();
        var template = this.inputTemplate;


        if (this.model.isRepeating()) {
            template = this.inputTemplateRepeating;
        }

        return _.template(template, {
            "fieldId": fieldId,
            "index": index,
            "inputHtml": inputHtml,
            "required": this.getFieldRequired(index)
        });
    },
    renderHelpText: function() {
        var helpText = this.model.getHelpText();

        if (typeof helpText === "string" && helpText.length > 0) {
            return _.template(this.instructions, {
                "helpText": helpText
            });
        } else {
            return "";
        }

    },
    addElement: function() {
        var index = this.curRepeat;
        var inputHtml = this.renderInput(index);
        var eleHtml = this.renderEle("", inputHtml, index);
        this.$fieldWrapper.append(eleHtml);
        this.curRepeat++;
        this.onElementShow(index);
    },
    onElementShow: function(index) {
        $fh.forms.log.d("Show done for field " + index);
    },
    render: function() {
        var self = this;
        this.initialRepeat = 1;
        this.maxRepeat = 1;
        this.curRepeat = 0;

        this.$fieldWrapper.append(this.renderTitle());
        this.$fieldWrapper.append(this.renderHelpText());

        if (this.model.isRepeating()) {
            this.initialRepeat = this.model.getMinRepeat();
            this.maxRepeat = this.model.getMaxRepeat();
        }
        for (var i = 0; i < this.initialRepeat; i++) {
            this.addElement();
        }

        this.$el.append(this.$fieldWrapper);
        this.$el.append(this.$fh_appform_fieldActionBar);
        this.$el.attr("data-field", this.model.getFieldId());


        if (this.options.sectionName) {
            //This field belongs to a section
            this.options.parentEl.find('#fh_appform_' + this.options.sectionName).append(this.$el);
        } else {
            this.options.parentEl.append(this.$el);
        }



        // force the element to be initially hidden
        if (this.$el.hasClass("hide")) {
            this.hide(true);
        }
        // populate field if Submission obj exists
        var submission = this.options.formView.getSubmission();
        if (submission) {
            this.submission = submission;
            this.submission.getInputValueByFieldId(this.model.get('_id'), function(err, res) {
                self.value(res);
            });
        }
        this.show();
        this.checkActionBar();
        this.onRender();
    },
    onRender: function() {

    },
    // TODO: cache the input element lookup?
    initialize: function() {
        _.bindAll(this, 'dumpContent', 'clearError', 'onAddInput', 'onRemoveInput');

        // if (this.model.isRequired()) {
        //   this.$el.addClass('required');
        // }
        this.$fieldWrapper = $(this.fieldWrapper);
        this.$fh_appform_fieldActionBar = $(this.fh_appform_fieldActionBar);
        // only call render once. model will never update
        this.render();
    },

    dumpContent: function() {
        $fh.forms.log.d("Value changed :: " + JSON.stringify(this.value()));
    },

    getTopView: function() {
        var view = this.options.parentView;
        var parent;
        do {
            parent = view.options.parentView;
            if (parent) {
                view = parent;
            }
        } while (parent);
        return view;
    },
    validateElement: function(index, element, cb) {
        var self = this;
        var fieldId = self.model.getFieldId();
        self.model.validate(element, index, function(err, res) {
            if (err) {
                self.setErrorText(index, "Error validating field: " + err);
                if (cb) {
                    cb(err);
                }
            } else {
                var result = res["validation"][fieldId];
                if (!result.valid) {
                    var errorMessages = result.errorMessages.join(", ");
                    self.setErrorText(index, errorMessages);
                    if (cb) {
                        cb(errorMessages);
                    }
                } else {
                    self.clearError(index);
                    if (cb) {
                        cb();
                    }
                }
            }
        });
    },
    validate: function(e) {
        var self = this;
        var target = $(e.currentTarget);
        var index = target.data().index;
        var val = self.valueFromElement(index);
        self.validateElement(index, val);
        self.trigger("checkrules");
    },
    setErrorText: function(index, text) {
        var wrapperObj = this.getWrapper(index);
        wrapperObj.find(this.errMessageContainer).text(text);
        wrapperObj.find(this.errMessageContainer).show();
        wrapperObj.find(this.errMessageContainer).addClass(this.errorClassName);
        wrapperObj.find("input,textarea,select").addClass(this.errorClassName);
    },
    contentChanged: function(e) {
        this.validate(e);
    },

    isRequired: function() {
        return this.model.isRequired();
    },

    // force a hide , defaults to false
    hide: function(force) {
        this.$el.hide();
    },
    renderButton: function(index, label, extension_type) {
        var button = $('<button>');
        button.addClass('special_button fh_appform_button_action');
        button.addClass(extension_type);
        button.attr("data-index", index);
        button.html(' ' + label);

        return this.htmlFromjQuery(button);
    },
    //deprecated
    addButton: function(input, extension_type, label) {
        var self = this;
        var button = $('<button>');
        button.addClass('special_button fh_appform_button_action');
        button.addClass(extension_type);
        button.html(' ' + label);


        button.click(function(e) {
            self.action(this);
            e.preventDefault();
            return false;
        });

        input.append(button);
        return button;
    },

    show: function() {
        this.$el.show();
    },

    defaultValue: function() {
        var defaultValue = {};
        defaultValue[this.model.get('_id')] = this.model.get('DefaultVal');
        return defaultValue;
    },
    htmlFromjQuery: function(jqObj) {
        return $('<div>').append(jqObj.clone()).html();
    },
    // Gets or Set the value for this field
    // set value should be an array which contains repeated value for this field.
    value: function(value) {
        var self = this;
        if (value && !_.isEmpty(value)) {
          self.valuePopulate(value);
        }
        return self.getValue();
    },
    getValue: function() {
        var value = [];
        var repeatNum = this.curRepeat;
        for (var i = 0; i < repeatNum; i++) {
            value[i] = this.valueFromElement(i);
        }
        return value;
    },
    valueFromElement: function(index) {
        var wrapperObj = this.getWrapper(index);
        return wrapperObj.find("input,select,textarea").val() || "";
    },
    valuePopulate: function(value) {
        var number = value.length;
        while (number > this.curRepeat) {
            this.addElement();
        }

        for (var i = 0; i < value.length; i++) {
            var v = value[i];
            this.valuePopulateToElement(i, v);
        }
    },
    valuePopulateToElement: function(index, value) {
        var wrapperObj = this.getWrapper(index);
        wrapperObj.find("input,select,textarea").val(value);
    },
    getWrapper: function(index) {
        var fieldId = this.model.getFieldId();
        return this.$fieldWrapper.find("#wrapper_" + fieldId + "_" + index);
    },
    fillArray: function(array, filler) {
        for (var i = 0; i < array.length; i++) {
            if (!array[i]) {
                array[i] = filler;
            }
        }
    },

    clearError: function(index) {
        var wrapperObj = this.getWrapper(index);
        wrapperObj.find(this.errMessageContainer).hide();
        wrapperObj.find("." + this.errorClassName).removeClass(this.errorClassName);
    }

});