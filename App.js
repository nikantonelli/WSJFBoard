Ext.define('myPicker', {
    alias: 'widget.myPicker',   //For xtype
    extend: 'Rally.ui.picker.project.ProjectPicker',

    bubbleEvents:[
        'updateBacklogNode'
    ],

    listeners: {
        afterrender: function() {
            this.expand();
        },
        change: function() {
            //Save the selected record
            this.fireEvent('updateBacklogNode', this.getSelectedRecord().data);
        }
    },
    expand: function () {
        if (this.isLoaded) {
            this.removePlaceholderText();
            this.callParent(arguments);
            if (!this.firstTime && this.savedRecord) {
                this.setValue(this.savedRecord._ref);
                this.collapse();
                this.firstTime = true;
                this.fireEvent('select');
            }
        } else {
            this.setPlaceholderText(this.getLoadingText());
            this.tree.loadTopLevel().then({
                success: function () {
                    this.isLoaded = true;
                    this.expand();
                },
                scope: this
            });
        }
    },
    
});

Ext.define('wsjfProgressBar', {
    alias: 'widget.wsjfProgressBar',
    extend: Ext.Component,
    constructor: function(config) {
        this.callParent(arguments);
        this.renderTpl = Ext.create('Rally.ui.renderer.template.progressbar.ProgressBarTemplate', {
            percentDoneName: 'PercentDone',
            height: '15px',
            width: '100%%',
            isClickable: false,
            calculateColorFn: function(values) {
                return Rally.util.Colors.cyan;
            }
        });
        this.on( {
            afterrender: this._onAfterRender,
            scope: this
        });
    },

    _onAfterRender: function() {
        this.update();
    },
    
    value: 0,

    set: function(value) {
        this.value = value;
        this.update();
    },

    update: function(value) {
        if ( undefined !== value) {
            this.value = value;
        }
        var html = this.renderTpl.apply({PercentDone: this.value});
        this.callParent([html]);
    }
});

Ext.define('Rally.ui.grid.plugin.DependenciesPopoverPlugin', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.rallydependenciesplugin',
    require: ['Rally.ui.popover.DependenciesPopover'],

//    constructor: function(config) {
//        this.initConfig(config);
//        return this.callParent(arguments);
//    },
//
    init: function(cmp) {
        this.callParent(arguments);
        this._delayedTask = Ext.create('Ext.util.DelayedTask', this._showPopover, this);
        this.cmp.on('afterrender', function() {
            this.cmp.getEl().on('mouseover', this._onMouseOver, this, {
                delegate: '.formatted-id-link'
            });
            this.cmp.getEl().on('mouseout', this._onMouseOut, this, {
                delegate: '.formatted-id-link'
            });
        }, this, {single: true});
    },

    _onMouseOver: function(event, target) {
        this._delayedTask.delay(500, null, null, [target]);
    },

    _onMouseOut: function() {
        this._delayedTask.cancel();
    },

    _showPopover: function (target) {
        var el = Ext.get(target);
        var tr = el.up(this.cmp.view.getDataRowSelector());
        var record = this.cmp.view.getRecord(tr);

        if (record && !Ext.getElementById('description-popover')) {
            var targetRef = el.dom.href && _.last(el.dom.href.split('/detail/'));
            var targetOid = targetRef && Rally.util.Ref.getOidFromRef(targetRef);

            var popoverOptions = {
                context: this.cmp.context,
                field: 'Description',
                target: el,
                targetSelector: '#' + el.id
            };

            if (targetOid && record.get('ObjectID') !== targetOid) {
                popoverOptions.oid = targetOid;
                popoverOptions.type = Rally.util.Ref.getTypeFromRef(targetRef);
            } else {
                popoverOptions.record = record;
            }
            Rally.ui.popover.PopoverFactory.bake(popoverOptions);
        }
    },

    destroy: function() {
       if(this._delayedTask) {
           this._delayedTask.cancel();
       }
    }
});


Ext.define('Rally.ui.bulk.RecordMenuFix', {
    override: 'Rally.ui.menu.bulk.RecordMenu',
    _getMenuItems: function() {
        var records = this.getRecords();
        var items = this.callParent(arguments);
        items.push({
            xtype: 'wsjfBulkSetRisk',
            id: 'wsjfBulkSetRisk'
        });
        items.push({
            xtype: 'wsjfBulkSetCost',
            id: 'wsjfBulkSetValue'
        });
        items.push({
            xtype: 'wsjfBulkSetCust',
            id: 'wsjfBulkSetTime'
        });
        items.push({
            xtype: 'wsjfBulkSetRevn',
            id: 'wsjfBulkSetRevn'
        });

        if (Ext.getCmp('wsjfApp').getSetting('usePrelim') === false) {
            items.push({
                xtype: 'wsjfBulkSetSize',
                id: 'wsjfBulkSetSize'
            });
        }

        _.each(items, function(item) {
            Ext.apply(item, {
                records: records,
                store: this.store,
                onBeforeAction: this.onBeforeAction,
                onActionComplete: this.onActionComplete,
                context: this.getContext()
            });
        }, this);

        return items;
    }
});


Ext.define('CustomApp', {
    extend: 'Rally.app.TimeboxScopedApp',
    componentCls: 'app',
    settingsScope: 'project',
    id: 'wsjfApp',

    config: {
        defaultSettings: {
            usePrelim: false,
            showFilter: false,
            useWSJFReadOnly: true,
            useStateField: false,
            useProjectField: false,
            useWSJFAutoSort: true,
            showChange: true,
            globalOverride: true
        }
    },
    _customFields: ['c_controlWSJF','c_CostImpactWeighting','c_CustomerImpactWeighting','c_RiskImpactWeighting','c_RevenueImpactWeighting'],

    stateful: true,

    onTimeboxScopeChange: function(newTimeboxScope) {
        this.callParent(arguments);
        this._startApp(this);
    },

    getSettingsFields: function() {
        return [{
            xtype: 'textarea',
            fieldLabel: 'Query',
            name: 'query',
            anchor: '100%',
            cls: 'query-field',
            margin: '0 70 0 0',
            plugins: [{
                    ptype: 'rallyhelpfield',
                    helpId: 194
                },
                'rallyfieldvalidationui'
            ],
            validateOnBlur: false,
            validateOnChange: false,
            validator: function(value) {
                try {
                    if (value) {
                        Rally.data.wsapi.Filter.fromQueryString(value);
                    }
                    return true;
                } catch (e) {
                    return e.message;
                }
            }
        }, {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Use Preliminary Estimate',
            labelWidth: 200,
            name: 'usePrelim'
        }, {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Make WSJF field read-only',
            labelWidth: 200,
            name: 'useWSJFReadOnly'
        }, {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Auto-sort on change',
            labelWidth: 200,
            name: 'useWSJFAutoSort'
        }, {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Show State Field',
            labelWidth: 200,
            name: 'useStateField'
        }, {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Show Project Field',
            labelWidth: 200,
            name: 'useProjectField'
        },{
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Show Advanced filter on the application. This will remove the ability to commit the rank',
            labelWidth: 200,
            name: 'showFilter'
        },{
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Allow Weighting Changes',
            labelWidth: 200,
            name: 'showChange',
        },{
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Allow Global Rank Override',
            labelWidth: 200,
            name: 'globalOverride',
        }];
    },


    launch: function() {

        var app = this;
        Deft.Chain.pipeline([this._adminStatus, this._getProject, this._setupApp, this._getStateValues, this._startApp], this);
    },

    _getStateValues: function(type) {
        var app = this;
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: type
        }). then ({
            success: function(model){
                app.stateValues = model.getField('State').getAllowedStringValues();
                deferred.resolve(app);
            },
            failure: function() {
                deferred.reject();
            }
        });
        return deferred.promise;
    },
    
    _adminStatus: function () {
        var app = this;
        app.weAreAdmin = false;
        var deferred = Ext.create('Deft.Deferred');
        var globalProject = app.getContext().getGlobalContext().context.scope.projectOid;
        Ext.create('Rally.data.wsapi.Store',{
            model:'Project',
            autoLoad: true,
            fetch:['Children','Name',].concat(this._customFields),
            filters: [ {
                property: 'ObjectID',
                value: globalProject
            }],
            limit:'Infinity',
            listeners: {
                load: function(store,projects) {
                    if (projects[0].get('c_controlWSJF') ) { app.weAreAdmin = true; }
                    deferred.resolve(projects);
                }
            }
        });
        return deferred.promise;    
    },

    _getProject: function(globalProjects) {
        var context = this.getContext();
        var project = context.getProject();
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store',{
            model:'Project',
            autoLoad: true,
            fetch:['Children','Name',].concat(this._customFields),
            filters: [ {
                property: 'ObjectID',
                value: project.ObjectID
            }],
            limit:'Infinity',
            listeners: {
                load: function(store,projects) {
                    deferred.resolve(projects);
                }
            }
        });
        return deferred.promise;
    },

    _setupApp: function(projects) {
        
        var deferred = Ext.create('Deft.Deferred');

        var project = projects[0];  //Only interested in the one we are in.
        var app = this;

        this.add({
            xtype: 'container',
            id: 'headerBox',
            layout: 'column',
            border: 3,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        });

        this.add({
            xtype: 'container',
            id: 'filterBox'
        });

        Ext.getCmp('headerBox').add({
            xtype: 'rallyportfolioitemtypecombobox',
            labelWidth: 150,
            fieldLabel: 'Choose portfolio type:',
            id: 'itemType',
            margin: 10,
            listeners: {
                ready: function() {
                    deferred.resolve('portfolioitem/' + this.rawValue);
                    this.on('select', function() {app._startApp(app); });
                }
            },
            scope: this,
            align: 'left'
        });

        if(app.getSetting('showFilter')){
            Ext.getCmp('headerBox').add({
                xtype: 'rallyinlinefiltercontrol',
                name: 'inlineFilter',
                itemId: 'inlineFilter',
                margin: '10 10 10 10',                           
                context: this.getContext(),
                height:26,
                inlineFilterButtonConfig: {
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('inline-filter'),
                    context: this.getContext(),
                    modelNames: ['PortfolioItem'],
                    filterChildren: false,
                    inlineFilterPanelConfig: {
                        quickFilterPanelConfig: {
                            defaultFields: ['ArtifactSearch', 'Owner']
                        }
                    },
                    listeners: {
                        inlinefilterchange: this._onFilterChange,
                        inlinefilterready: this._onFilterReady,
                        scope: this
                    } 
                }
            });            
        }

        //Add fields to show current project weighting
        var vbox = Ext.getCmp('headerBox').add({
            xtype: 'container',
            listeners: {
                afterrender: function() {
                    //debugger;
                }
            },
            layout: 'hbox',
            items: [
                {
                    xtype: 'container',
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            items: [
                                {
                                    xtype: 'label',
                                    width: '120px',
                                    margin: '10 0 10 10',
                                    text: 'Cost Weighting',
                                    forId: 'costweighting',
                                },
                                {
                                    xtype: 'wsjfProgressBar',
                                    width: '100px',
                                    margin: '10 10 0 10',
                                    id: 'costweighting',
                                    value: project.get('c_CostImpactWeighting')/100
                                },
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            items: [
                                {
                                    xtype: 'label',
                                    width: '120px',
                                    margin: '0 0 10 10',
                                    text: 'Customer Weighting',
                                    forId: 'custweighting',
                                },
                                {
                                    xtype: 'wsjfProgressBar',
                                    width: '100px',
                                    margin: '0 10 10 10',
                                    value: project.get('c_CustomerImpactWeighting')/100,
                                    id: 'custweighting',
                                },
                            ]
                        }
                    ]
                },
                {
                    xtype: 'container',
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            items: [
                                {
                                    xtype: 'label',
                                    width: '120px',
                                    margin: '10 0 0 10',
                                    text: 'Revenue Weighting',
                                    forId: 'revnweighting',
                                },
                                {
                                    xtype: 'wsjfProgressBar',
                                    width: '100px',
                                    margin: '10 10 0 10',
                                    id: 'revnweighting',
                                    value: project.get('c_RevenueImpactWeighting')/100,
                                },
                            ]
                        },{
                            xtype: 'container',
                            layout: 'hbox',
                            items: [
                                {
                                    xtype: 'label',
                                    width: '120px',
                                    margin: '10 0 10 10',
                                    text: 'Risk Weighting',
                                    forId: 'riskweighting',
                                },
                                {
                                    xtype: 'wsjfProgressBar',
                                    width: '100px',
                                    margin: '10 10 0 10',
                                    id: 'riskweighting',
                                    value: project.get('c_RiskImpactWeighting')/100,
                                },
                            ]
                        }
                    ]
                }
            ]
        });

        //If we are admin, allow for setting of the project variables
        if (app.weAreAdmin ) {
            //Ext.getCmp('headerBox').add({
            var weightingBox = Ext.create( 'Ext.Container', {
                id: 'weightingBox',
                layout: 'hbox',
                items: [ 
                    {   
                        xtype: 'container',
                        id: 'innerbox',
                        layout: 'vbox',
                        items: [
                            {
                                xtype: 'rallybutton',
                                margin: '10 0 0 10',
                                width: 160,
                                text: 'Change Weightings',
                                style: {
                                    backgroundColor: Rally.util.Colors.cyan,
                                },
                                handler: function() {
                                    var workspace = app.getContext().getWorkspace();
                                    var doChooser = Ext.create('Rally.ui.dialog.Dialog', {
                                        id: 'projectChooser',
                                        items: [
                                            {
                                                xtype: 'myPicker',
                                                id: 'projectChooserId',
                                                fieldLabel: 'Backlog Node ',
                                                workspace: workspace._ref,
                                                savedRecord: project.data,
                                            },
                                            {
                                                xtype: 'rallycheckboxfield',
                                                fieldLabel: 'Change all children projects',
                                                id: 'doChildrenId',
                                                disabled: true
                                            },
                                            { 
                                                xtype: 'container', 
                                                id: 'sliderId',
                                                layout: 'hbox',
                                                items: [
                                                    {
                                                        xtype: 'rallyslider',
                                                        id: 'costSlider',
                                                        minValue: 0,
                                                        maxValue:100,
                                                        vertical: true,
                                                        height: 300,
                                                        labelAlign: 'top',
                                                        value: ((Ext.getCmp('costweighting').value || 1)*100),
                                                        fieldLabel: 'Cost',
                                                        margin: '0 0 0 10'
                                                    },{
                                                        xtype: 'rallyslider',
                                                        id: 'custSlider',
                                                        minValue: 0,
                                                        maxValue:100,
                                                        vertical: true,
                                                        height: 300,
                                                        value: ((Ext.getCmp('custweighting').value || 1)*100),
                                                        labelAlign: 'top',
                                                        fieldLabel: 'Customer'
                                                    },{
                                                        xtype: 'rallyslider',
                                                        vertical: true,
                                                        minValue: 0,
                                                        maxValue:100,
                                                        height: 300,
                                                        id: 'revnSlider',
                                                        value: ((Ext.getCmp('revnweighting').value || 1)*100),
                                                        labelAlign: 'top',
                                                        fieldLabel: 'Revenue'
                                                    },{
                                                        xtype: 'rallyslider',
                                                        vertical: true,
                                                        height: 300,
                                                        minValue: 0,
                                                        maxValue:100,
                                                        id: 'riskSlider',
                                                        value: ((Ext.getCmp('riskweighting').value || 1)*100),
                                                        labelAlign: 'top',
                                                        fieldLabel: 'Risk'
                                                    },
                                                ]
                                            }
                                        ],
                                        autoShow: true,
                                        closable: true,
                                        // draggable: true,
                                        width: 400,
                                        title: 'Choose Projects to Change',
                                        listeners: {
                                            afterrender: function() {
                                                Ext.getCmp('projectChooserId').on('expand', this._enableOK);
                                            }
                                        },
                                        buttons: [
                                            {
                                                text: 'OK',
                                                disabled: true,
                                                id: 'OKbutton',
                                                handler: function(arg1, arg2, arg3) {
                                                    //Get all the projectChoosers selection
                                                    app._changeProjectWeightings(
                                                        Ext.getCmp('projectChooserId'), 
                                                        Ext.getCmp('doChildrenId'), 
                                                        Ext.getCmp('sliderId') 
                                                    );
                                                    var store = Ext.getCmp('piGrid').store;
                                                    var me = Ext.getCmp('wsjfApp');
                                                    _.each(store.getRecords(), function(record) {
                                                        var num = me._calcWSJF(record).toFixed(2);
                                                        if ( num !== record.get('c_weightedWSJF').toFixed(2)) {
                                                            record.set('c_weightedWSJF', parseFloat(num));
                                                        }
                                                    });
                                                    //Ext.getCmp('piGrid').getView().refresh();
                                                    doChooser.destroy();
                                                },
                                            },
                                            {
                                                text: 'Cancel',
                                                handler: function() {
                                                    doChooser.destroy();
                                                }
                                            }
                                        ],
                                        scope: app,
                                        _enableOK: function() {
                                            Ext.getCmp('OKbutton').enable();
                                        }
                                    });
                                }
                            },
                            {
                                xtype: 'rallybutton',
                                id: 'saveWeightings',
                                margin: '9 0 10 10',   //Incompatability of font sizes!
                                width: 160,
                                text: 'Save Weighted WSJF',
                                style: {
                                    backgroundColor: Rally.util.Colors.cyan,
                                },
                                handler: this._saveStore,
                                scope: this
                            }
                        ]
                    }
                ]
            });
            weightingBox.add( {
                xtype: 'rallybutton',
                id: 'commitWWSJF',
                margin: 10,
                width: 160,
                text: 'Commit Weighted WSJF',
                style: {
                    backgroundColor: Rally.util.Colors.cyan,
                },
                handler: this._commitWWSJF,
                scope: this
        });
            //We should prevent re-ordering of rank if we have sub-sampled by release or a filter
            //It makes for a confusing result otherwise
            var timeboxscope = this.getContext().getTimeboxScope();
            if (!timeboxscope && !app.getSetting('showFilter')) {
                weightingBox.add({
                    xtype: 'rallybutton',
                    id: 'MakeItSo',
                    margin: 10,
                    width: 160,
                    text: 'Rank by WSJF',
                    style: {
                        backgroundColor: Rally.util.Colors.cyan,
                    },
                    handler: this.commitRecords,
                    scope: this
                });

                //Add the option to commit first record to top of global rank.
                if (app.getSetting('globalOverride')){
                    weightingBox.add({
                        xtype: 'rallycheckboxfield',
                        fieldLabel: 'Override global rank',
                        id: 'globalCheck',
                        value: false,
//                        margin: 10
                    });
                }
            }
            Ext.getCmp('headerBox').add(weightingBox);
        }

        return deferred.promise;

    },

    _changeProjectWeightings: function(projectChooser, doChildren, sliders) {
        var selected = projectChooser.getSelectedRecord();
        var risk = sliders.getComponent('riskSlider').getSubmitValue();
        selected.set('c_RiskImpactWeighting', risk);
        var cust = sliders.getComponent('custSlider').getSubmitValue();
        selected.set('c_CustomerImpactWeighting', cust); 
        var cost = sliders.getComponent('costSlider').getSubmitValue();
        selected.set('c_CostImpactWeighting', cost); 
        var revn = sliders.getComponent('revnSlider').getSubmitValue();
        selected.set('c_RevenueImpactWeighting', revn); 
        selected.save({
            callback: function() {
                console.log ( 'Project Weightings: ', risk, cost, cust, revn);
                Ext.getCmp('riskweighting').update(risk/100);           
                Ext.getCmp('costweighting').update(cost/100);           
                Ext.getCmp('custweighting').update(cust/100);           
                Ext.getCmp('revnweighting').update(revn/100);           
            }
        });


        // Ext.getCmp('riskweighting').updateProgress(risk/100);
        // Ext.getCmp('riskweighting').updateText(risk);
        // Ext.getCmp('costweighting').updateProgress(cost/100);
        // Ext.getCmp('costweighting').updateText(cost);

        // Ext.getCmp('custweighting').updateProgress(cust/100);
        // Ext.getCmp('custweighting').updateText(cust);
        // Ext.getCmp('revnweighting').updateProgress(revn/100);
        // Ext.getCmp('revnweighting').updateText(revn);
        
    },

    _onFilterChange: function(inlineFilterButton){
        var me = this;
        me.advFilters = inlineFilterButton.getTypesAndFilters().filters;
        me._startApp(me);
    },

    _onFilterReady: function(inlineFilterPanel) {
        var me = this;
        Ext.getCmp('filterBox').add(inlineFilterPanel);
    },



    _getFilters: function(app) {
        var filters = [];

        // We do not have timeboxes on higher level portfolio items
        if (Ext.getCmp('itemType').getRecord() && Ext.getCmp('itemType').getRecord().data.Ordinal === 0) {
            var timeboxscope = this.getContext().getTimeboxScope();
            if (timeboxscope) {
                var filterQuery = timeboxscope.getQueryFilter();
                if (filterQuery.value) {
                    filters.push(filterQuery.value.config);
                } else {
                    filters.push({
                        property: 'Release',
                        operator: '=',
                        value: null

                    });
                }
            }
        }

        filters.push({
            property: 'State.Name',
            operator: '!=',
            value: app.stateValues[ app.stateValues.length - 1]
        });

        //Now get the settings query box and apply those settings
        var queryString = app.getSetting('query');
        if (queryString) {
            var cmpMakeitSo = Ext.getCmp('MakeItSo');
            if (cmpMakeitSo) {
                // In certain cases when the page alrady was filtered, for e.g. Release filtered this component might not be present.
                cmpMakeitSo.hide(); //Don't allow committing if subselected
            }
            var cmpGlobalCheck = Ext.getCmp('globalCheck');
            if (cmpGlobalCheck) {
                // Similar for the Global Check that might not be present.
                cmpGlobalCheck.hide();
            }
            var filterObj = Rally.data.wsapi.Filter.fromQueryString(queryString);
            filterObj.itemId = filterObj.toString();
            filters.push(filterObj);
        }

        if(this.getSetting('showFilter') && this.advFilters.length > 0){
            Ext.Array.each(this.advFilters,function(filter){
                filters.push(filter);
            });
        }

        return filters;
    },

    _startApp: function(app) {

        var modeltype = 'portfolioitem/' + Ext.getCmp('itemType').rawValue;
        var modelNames = [modeltype];

        var oldGrid = Ext.getCmp('piGrid');

        if (oldGrid) oldGrid.destroy();

        var columnCfgs = [
            'FormattedID',
            {
                dataIndex: 'Name'
            }
        ];

        if (app.getSetting('useStateField')) {
            columnCfgs.push({
                dataIndex: 'State',
                text: 'State',
                align: 'center'
            });
        }

        if (app.getSetting('useProjectField')) {
            columnCfgs.push({
                dataIndex: 'Project',
                text: 'Project',
                align: 'center'
            });
        }

        columnCfgs.push({
            dataIndex: 'c_CostImpactRating',
            text: 'Cost Impact',
            align: 'center',
            listeners: {
                afterrender: function() {
                    thisMenu = Ext.create('wsjfBulkSetCost');
                    helpHTML = thisMenu.getHelp();
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target: this.getEl(),
                        html: helpHTML
                    });
                }
            },
            editor: null
        }, {
            dataIndex: 'c_RevenueImpactRating',
            text: 'Revenue Impact',
            align: 'center',
            listeners: {
                afterrender: function() {
                    thisMenu = Ext.create('wsjfBulkSetRevn');
                    helpHTML = thisMenu.getHelp();
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target: this.getEl(),
                        html: helpHTML
                    });
                }
            },
            editor: null
        }, {
            dataIndex: 'c_CustomerImpactRating',
            text: 'Customer Impact',
            align: 'center',
            listeners: {
                afterrender: function() {
                    thisMenu = Ext.create('wsjfBulkSetCust');
                    helpHTML = thisMenu.getHelp();
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target: this.getEl(),
                        html: helpHTML
                    });
                }
            },
            editor: null
        }, {
            dataIndex: 'c_RiskImpactRating',
            text: 'Risk Impact',
            align: 'center',
            listeners: {
                afterrender: function() {
                    thisMenu = Ext.create('wsjfBulkSetRisk');
                    helpHTML = thisMenu.getHelp();
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target: this.getEl(),
                        html: helpHTML
                    });
                }
            },
            editor: null
        });


        sizeCol = {
            text: 'Size',
            align: 'center',
            listeners: {
                afterrender: function() {
                    thisMenu = Ext.create('wsjfBulkSetSize');
                    helpHTML = thisMenu.getHelp();
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target: this.getEl(),
                        html: helpHTML
                    });
                }
            }

        };

        // If we are using preliminary estimate, pick up that instead.

        if (app.getSetting('usePrelim')) {
            sizeCol = _.merge(sizeCol, {
                dataIndex: 'PreliminaryEstimate'
            });
        } else {
            sizeCol = _.merge(sizeCol, {
                dataIndex: 'JobSize'
            });
        }

        columnCfgs.push(sizeCol);

        var tpl = new Ext.XTemplate(
            '<div {[this.cellCheck(values)]}>{[this.cellFormat(values.c_weightedWSJF)]}</div>',
            {
                cellCheck: function(values) { 
                    if (values.c_weightedWSJF.toFixed(2) > values.WSJFScore) {
                        return 'class="upgradedItem"';
                    }
                    else  if (values.c_weightedWSJF.toFixed(2) < values.WSJFScore) {
                        return 'class="downgradedItem"';
                    }
                    else {return '';}
                },
                cellFormat: function(wsjf) {
                    return wsjf.toFixed(2);
                }
            }
        );
        weightedWsjfCol = {
            dataIndex: 'c_weightedWSJF',
            text: 'Weighted WSJF',
            xtype: 'templatecolumn',
            tpl: tpl,
            align: 'center',
            editRenderer: function() { //debugger;
            },
            editor: null
        };

        columnCfgs.push(weightedWsjfCol);

        wsjfCol = {
            dataIndex: 'WSJFScore',
            text: 'Current WSJF',
            align: 'center',
            listeners: {
                afterrender: function() {
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target: this.getEl(),
                        html: '<p><strong>WSJF = Impact(Risk + Cost + Revenue + Customer)/Job Size</strong></p>',
                    });
                }
            }
        };

        if (app.getSetting('useWSJFReadOnly')) {
            wsjfCol = _.merge(wsjfCol, {
                editor: null
            });
        }

        columnCfgs.push(wsjfCol);

        var grid = Ext.create('Rally.ui.grid.Grid', {
            id: 'piGrid',
            margin: '40, 10, 40, 10',

//            plugins: ['rallydescriptionpopover' ],

            plugins: [
                'rallydependenciesplugin'
            ],

            columnCfgs: columnCfgs,

            bulkEditConfig: {
                showEdit: false,
                showTag: false,
                showParent: false,
                showRemove: false
            },
            context: this.getContext(),
            enableBulkEdit: true,
            enableRanking: true,
            enableColumnResize: true,
            sortableColumns: true,

            storeConfig: {
                pageSize: 200,
                batchAction: true,
                model: modelNames,
                sorters: [{
                    property: 'c_weightedWSJF',
                    direction: 'DESC'
                }, {
                    property: 'DragAndDropRank',
                    direction: 'ASC'
                }],
                fetch: ['FormattedID', 'PreliminaryEstimate', 'PreliminaryEstimateValue', 'State', 'Name', 'Release', 'Project', 'JobSize', 'c_controlWSJF', 'c_RevenueImpactRating','c_CostImpactRating', 'c_RiskImpactRating', 'c_CustomerImpactRating', 'WSJFScore', 'State'],
                filters: app._getFilters(app)
            },

            listeners: {
                inlineeditsaved: function(grid, record, opts) {
                    app._saveWSJF(record);
                },
                load: function(store) {
                    app._store = store;
                },
                scope: app
            },
        });

//                Ext.util.Observable.capture( grid, function(event) { console.log(event, arguments);});

        this.add(grid);

    },

    _saveStore: function() {
        var store = Ext.getCmp('wsjfApp')._store;
        if ( store.getModifiedRecords().length > 0) {
            Ext.getCmp('weightingBox').setLoading('Saving values...');
            Ext.getCmp('wsjfApp')._store.sync({
                callback: function(batch, options) {
                    Ext.getCmp('weightingBox').setLoading(false);                
                    console.log('Store save returned: ',batch, options );
                } 
            });
        }
    },

    _saveWSJF: function(record) {
        if (!(record.raw.hasOwnProperty('c_weightedWSJF'))) { return; }  //The field might not be visible
        var num  = this._calcWSJF(record).toFixed(2);
        var oldVal = (record.get('WSJFScore') || 0).toFixed(2);
        //if the field is 'decimal' you can only have two decimal places....or it doesn't save it!

        if (num !== oldVal) {
            record.set('WSJFScore', parseFloat(num));
            record.save({
                callback: function() {
                    console.log('Updated WSJF for ',record.get('FormattedID'), ' from: ', oldval, ' to: ', num);
                }
            });
        }
    },

    _commitWWSJF: function() {
        var app = Ext.getCmp('wsjfApp');
        var records = app._store.getRecords();
        _.each(records, function(record) {
            if ( record.get('WSJFScore') !== record.get('c_weightedWSJF')){
                record.set('WSJFScore', record.get('c_weightedWSJF'));
            }
        });

        app._saveStore();
    },

    _calcWSJF: function(record) {
        var num = 0.0;
        var peVal = 0;
        num = ( Math.abs(parseInt(record.get('c_RevenueImpactRating') || 0) * Ext.getCmp('revnweighting').value) + 
        (Math.abs(parseFloat(record.get('c_CostImpactRating') || 0)) * Ext.getCmp('costweighting').value) + 
        (Math.abs(parseFloat(record.get('c_CustomerImpactRating') || 0)) * Ext.getCmp('custweighting').value) + 
        (Math.abs(parseFloat(record.get('c_RiskImpactRating') || 0)) * Ext.getCmp('riskweighting').value));
        
        if (Ext.getCmp('wsjfApp').getSetting('usePrelim')) {
            // If no Prelim value, don't give a random number;
            if ((peVal = record.get('PreliminaryEstimateValue')) > 0) {
                num = num / peVal;
            }
            else {
                num = 0;
            }
        } else {
            num = num / record.get('JobSize');
        }
        return num;
    },

    _recordToRank: 0,
    _rankingRecord: null,
    _store: null,

    commitRecords: function() {
        var records = this._store.getRecords();
        _.each(records, function (record) {
            record.set ('WSJFScore', parseFloat(record.get('c_weightedWSJF').toFixed(2)));
        });
        this._store.sync();

        this._recordToRank = 0;
        this._rankingRecord = this._store.data.items[this._recordToRank];

        if (Ext.getCmp('globalCheck') && (Ext.getCmp('globalCheck').value === true)) {

            this._rankingRecord.save({
                rankTo: 'TOP',
                callback: function(arg1, arg2, arg3) {
                    this._recordToRank += 1;
                    this._saveNextRecord();
                },
                scope: this
            });
        } else {
            this._recordToRank += 1;
            this._saveNextRecord();
        }
    },

    _saveNextRecord: function() {
        if (this._recordToRank < this._store.totalCount) {
            var nextRecord = this._store.data.items[this._recordToRank];
            Rally.data.Ranker.rankRelative({
                recordToRank: nextRecord,
                relativeRecord: this._rankingRecord,
                position: 'after',
                saveOptions: {
                    callback: function(arg1, arg2, arg3) {
                        this._recordToRank += 1;
                        this._rankingRecord = arg1;
                        this._saveNextRecord();
                    },
                    scope: this
                }
            });
        }
    }



});

Ext.define('dataModel', {
    extend: 'Ext.data.Model',
    fields: [{
        name: 'Name',
        type: 'string'
    }, {
        name: 'Value',
        type: 'integer'
    }, {
        name: 'Description',
        type: 'string'
    }]
});

Ext.define('Rally.ui.grid.localWSJFBulkSet', {
    extend: Rally.ui.menu.bulk.MenuItem,
    alias: 'widget.localWSJFBulkSet',

    _makeHelpFromData: function() {
        html = '';

        _.each(this.config.data, function(record) {
            html += '<p><strong>' + record.Name + ' ' + record.Description + '</strong></p>';
        });

        return html;
    },

    _onSetParam: function(chooserTitle, chooserField) {

        var store = Ext.create('Ext.data.Store', {
            autoLoad: true,
            model: 'dataModel',
            data: this.config.data,
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json',
                    root: 'dataValues'
                }
            }
        });

        var localBox = Ext.create('Ext.form.ComboBox', {
            id: 'localBox',
            store: store,
            queryMode: 'local',
            displayField: 'Name',
            valueField: 'Value'
        });

        var negativeSelect = Ext.create('Ext.form.field.Checkbox', {
            boxLabel: 'Negative',
            margin: '0 0 0 20',
            checked: false,
            id: 'negativeCheck'
        });


        var doChooser = Ext.create('Rally.ui.dialog.Dialog', {
            id: 'localChooser',
            autoShow: true,
            draggable: true,
            width: 300,
            records: this.records,
            title: chooserTitle,
            layout: 'hbox',
            items: [localBox, negativeSelect],
            buttons: [{
                text: 'OK',
                handler: function(arg1, arg2, arg3) {
                    _.each(this.records, function(record) {
                        var negative = 1;
                        if ( Ext.getCmp('negativeCheck').value) { negative = -1; }
                        record.set(chooserField, Ext.getCmp('localBox').value * negative);
                        var num = Ext.getCmp('wsjfApp')._calcWSJF(record);

                        //if the field is 'decimal' you can only have two decimal places....
                        record.set('c_weightedWSJF', parseFloat(num.toFixed(2)));
                        record.save({
                            callback: function() {
                                if (Ext.getCmp('wsjfApp').getSetting('useWSJFAutoSort')) {
                                    Ext.getCmp('piGrid').getView().refresh();
                                }
                            }
                        });
                    });
                    Ext.getCmp('localChooser').destroy();
                },
                scope: this
            }, {
                text: 'Cancel',
                handler: function() {
                    Ext.getCmp('localChooser').destroy();
                }
            }]
        });
    },

    getHelp: function() {
        return (this._makeHelpFromData());
    }

});

Ext.define('wsjfBulkSetRevn', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetRevn',

    config: {
        text: 'Revenue Impact Rating',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose Revenue Impact Rating', 'c_RevenueImpactRating');
        },

        data: [{
            'Name': 'None',
            'Value': 0,
            'Description': '(0)'
        }, {
            'Name': 'Minimal',
            'Value': 1,
            'Description': '(1)'
        }, {
            'Name': 'Low',
            'Value': 2,
            'Description': '(2)'
        }, {
            'Name': 'Medium',
            'Value': 3,
            'Description': '(3)'
        }, {
            'Name': 'High',
            'Value': 5,
            'Description': '(5)'
        }, {
            'Name': 'Very High',
            'Value': 8,
            'Description': '(8)'
        }, {
            'Name': 'Extreme',
            'Value': 13,
            'Description': '(13)'
        }]
    }
});

Ext.define('wsjfBulkSetRisk', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetRisk',

    config: {
        text: 'Risk Impact Rating',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose Risk Impact Rating', 'c_RiskImpactRating');
        },

        data: [{
            'Name': 'None',
            'Value': 0,
            'Description': '(0)'
        }, {
            'Name': 'Minimal',
            'Value': 1,
            'Description': '(1)'
        }, {
            'Name': 'Low',
            'Value': 2,
            'Description': '(2)'
        }, {
            'Name': 'Medium',
            'Value': 3,
            'Description': '(3)'
        }, {
            'Name': 'High',
            'Value': 5,
            'Description': '(5)'
        }, {
            'Name': 'Very High',
            'Value': 8,
            'Description': '(8)'
        }, {
            'Name': 'Extreme',
            'Value': 13,
            'Description': '(13)'
        }]
    }
});

Ext.define('wsjfBulkSetCust', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetCust',

    config: {
        text: 'Customer Impact Rating',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose Customer Impact Rating', 'c_CustomerImpactRating');
        },

        data: [{
            'Name': 'None',
            'Value': 0,
            'Description': '(0)'
        }, {
            'Name': 'Minimal',
            'Value': 1,
            'Description': '(1)'
        }, {
            'Name': 'Low',
            'Value': 2,
            'Description': '(2)'
        }, {
            'Name': 'Medium',
            'Value': 3,
            'Description': '(3)'
        }, {
            'Name': 'High',
            'Value': 5,
            'Description': '(5)'
        }, {
            'Name': 'Very High',
            'Value': 8,
            'Description': '(8)'
        }, {
            'Name': 'Extreme',
            'Value': 13,
            'Description': '(13)'
        }]
    }
});


Ext.define('wsjfBulkSetCost', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetCost',

    config: {
        text: 'Cost Impact Rating',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose Cost Impact Rating', 'c_CostImpactRating');
        },

        data: [{
            'Name': 'None',
            'Value': 0,
            'Description': '(0)'
        }, {
            'Name': 'Minimal',
            'Value': 1,
            'Description': '(1)'
        }, {
            'Name': 'Low',
            'Value': 2,
            'Description': '(2)'
        }, {
            'Name': 'Medium',
            'Value': 3,
            'Description': '(3)'
        }, {
            'Name': 'High',
            'Value': 5,
            'Description': '(5)'
        }, {
            'Name': 'Very High',
            'Value': 8,
            'Description': '(8)'
        }, {
            'Name': 'Extreme',
            'Value': 13,
            'Description': '(13)'
        }]
    }
});


Ext.define('wsjfBulkSetSize', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetSize',

    config: {
        text: 'Size',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose Size/Effort Rating', 'JobSize');
        },
        data: [{
            'Name': 'XS',
            'Value': 1,
            'Description': 'Less than 1 week'
        }, {
            'Name': 'S',
            'Value': 2,
            'Description': '1 - 3 weeks'
        }, {
            'Name': 'M',
            'Value': 3,
            'Description': '1 - 2 months'
        }, {
            'Name': 'L',
            'Value': 5,
            'Description': '3 - 6 months'
        }, {
            'Name': 'XL',
            'Value': 8,
            'Description': '6 - 9 months'
        }, {
            'Name': 'XXL',
            'Value': 13,
            'Description': '9 - 18 months'
        }, {
            'Name': 'XXXL',
            'Value': 21,
            'Description': 'Two years or more'
        }]
    }
});