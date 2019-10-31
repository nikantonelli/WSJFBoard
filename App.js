Ext.define('MyCustomGird', {
    extend: 'Rally.ui.grid.Grid',

    _requiresRefresh: function() {
    }

});

Ext.define('Rally.ui.grid.plugin.DependenciesPopoverPlugin', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.rallydependenciesplugin',
    require: ['Rally.ui.popover.DependenciesPopover'],

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

            this.cmp.recordAction({description: 'showing formatted id hover on grid'});
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
//        var items = this.callParent(arguments);
        var items = [];
        items.push({
            xtype: 'wsjfBulkSetRisk',
            id: 'wsjfBulkSetRisk'
        });
        items.push({
            xtype: 'wsjfBulkSetValue',
            id: 'wsjfBulkSetValue'
        });
        items.push({
            xtype: 'wsjfBulkSetTime',
            id: 'wsjfBulkSetTime'
        });
        items.push({
            xtype: 'wsjfBulkSetPlan',
            id: 'wsjfBulkSetPlan'
        });

        _.each(items, function(item) {
            Ext.apply(item, {
                records: records,
                store: this.store,
                onBeforeAction: this.onBeforeAction,
                onActionComplete: this.onActionComplete,
                context: this.getContext()
            });
        }, this);

        var bulkMenu = Ext.create( 'Rally.ui.menu.bulk.MenuItem', {
            text: 'Bulk Edit',
            handler: function() {
                Ext.create('Rally.ui.dialog.BulkierEditDialog', {
                    records: records
                })
            }
        });
        items.push( bulkMenu  );

        return items;
    }
});


Ext.define('CustomApp', {
    extend: 'Rally.app.TimeboxScopedApp',
    componentCls: 'app',

    id: 'wsjfApp',

    scopeType: 'release',
    settingsScope: 'project',

    stateful: true,

    onTimeboxScopeChange: function(newTimeboxScope) {
        this.callParent(arguments);
        gApp._startApp();
    },

    config: {
        defaultSettings: {
            useWSJFOverLoad: false,
            useWSJFReadOnly: true,
            useProjectField: true,
            useStateField: true,
            showFilter: false,
        },
        wsjfField: { field: 'WSJFScore', name: 'WSJF Score'},
        wsjfCalcFields:[   
            { field: 'RROEValue',         name: 'RR/OE',            menu: 'wsjfBulkSetRisk',  aboveLine: true },
            { field: 'UserBusinessValue', name: 'Derived Value',   menu: 'wsjfBulkSetValue', aboveLine: true },
            { field: 'TimeCriticality',   name: 'Time Criticality', menu: 'wsjfBulkSetTime',  aboveLine: true },
            { field: 'PlanEstimate',      name: 'Size',             menu: 'wsjfBulkSetPlan',  aboveLine: false }
        ]
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
            fieldLabel: 'Overwrite WSJF on load',
            labelWidth: 200,
            name: 'useWSJFOverLoad'
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
            fieldLabel: 'Show Advanced filter',
            labelWidth: 200,
            name: 'showFilter'
        }];
    },


    launch: function() {

        var context = this.getContext();
        gApp = this;


        this.add({
            xtype: 'container',
            id: 'headerBox',
            layout: 'column',
            border: 5,
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
            xtype: 'rallybutton',
            labelWidth: 150,
            text: 'Fetch Items',
            id: 'goDoIt',
            margin: 10,
            handler: function() {
                gApp._startApp();
            },
            scope: this,
            align: 'left'
        });

        if(gApp.getSetting('showFilter')){
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
                    modelNames: ['HierarchicalRequirement'],
                    filterChildren: false,
                    inlineFilterPanelConfig: {
                        quickFilterPanelConfig: {
                            defaultFields: ['ArtifactSearch', 'Owner', 'ScheduleState']
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

        gApp.timeboxscope = this.getContext().getTimeboxScope();
    },

    _onFilterChange: function(inlineFilterButton){
        gApp.advFilters = inlineFilterButton.getTypesAndFilters().filters;
        gApp._startApp();
    },

    _onFilterReady: function(inlineFilterPanel) {
        Ext.getCmp('filterBox').add(inlineFilterPanel);
    },



    _getFilters: function(app) {
        var filters = [];
        var timeboxscope = this.getContext().getTimeboxScope();
        if (timeboxscope) {
            var filterQuery = timeboxscope.getQueryFilter();
            if (filterQuery.value) {
                filters.push(filterQuery.value.config);
            }
        }

        filters.push({
            property: 'ScheduleState',
            operator: '<',
            value: 'Completed'
        });

        //Now get the settings query box and apply those settings
        var queryString = gApp.getSetting('query');
        if (queryString) {
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

    _startApp: function() {

        var modelNames = ['HierarchicalRequirement', 'Defect'];

        var oldGrid = Ext.getCmp('piGrid');

        if (oldGrid) oldGrid.destroy();

        var columnCfgs = [
            'FormattedID',
            {
                dataIndex: 'Name'
            }
        ];

        if (gApp.getSetting('useStateField')) {
            columnCfgs.push({
                dataIndex: 'ScheduleState',
                text: 'ScheduleState',
                align: 'center'
            });
        }

        if (gApp.getSetting('useProjectField')) {
            columnCfgs.push({
                dataIndex: 'Project',
                text: 'Project',
                align: 'center'
            });
        }

        _.each( gApp.wsjfCalcFields, function(field) {
            columnCfgs.push({
                dataIndex: field.field,
                text: field.name,
                align: 'center',
                listeners: {
                    afterrender: function() {
                        thisMenu = Ext.create(field.menu);
                        helpHTML = thisMenu.getHelp();
                        Ext.create('Rally.ui.tooltip.ToolTip', {
                            target: this.getEl(),
                            html: helpHTML
                        });
                    }
                }
            });
        });

        wsjfCol = {
            dataIndex: gApp.wsjfField.field,
            text: gApp.wsjfField.name,
            align: 'center',
            listeners: {
                afterrender: function() {
                    Ext.create('Rally.ui.tooltip.ToolTip', {
                        target: this.getEl(),
                        html: '<p><strong>WSJF = (RR/OE + Derived Value + Time Criticality)/Job Size</strong></p>'
                    });
                }
            }
        };

        if (gApp.getSetting('useWSJFReadOnly')) {
            wsjfCol = _.merge(wsjfCol, {
                editor: null
            });
        }

        columnCfgs.push(wsjfCol);

        var wsjfScore = gApp.wsjfField.field;
        var fetchList = [ 'FormattedID', 'PreliminaryEstimate', 'Name', 'Release', 'Project', 'ScheduleState', 'State', wsjfScore ];
        
        _.each(gApp.wsjfCalcFields, function(field) {
            fetchList.push(field.field);
        });
        
        var grid = Ext.create('Rally.ui.grid.Grid', {
            id: 'piGrid',
            margin: '40, 10, 40, 10',
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
                sorters: [
                {
                    property: gApp.wsjfField.field,
                    direction: 'DESC'
                }, 
                {
                    property: 'DragAndDropRank',
                    direction: 'ASC'
                }],
                fetch: fetchList,
                filters: gApp._getFilters()
            },

            listeners: {
                inlineeditsaved: function(grid, record, opts) {
                    this._saveWSJF(record);
                },
                load: function(store) {
                    if (gApp.getSetting('useWSJFOverLoad')) {
                        Ext.getCmp('headerBox').setLoading('Updating WSJF...'); 
                        var records = store.getRecords();
                        var me = this;
                        _.each(records, function(record) {
                            var num = gApp._calcWSJF(record).toFixed(2);
                            if ( num !== record.get(wsjfScore).toFixed(2)) {
                                record.set(wsjfScore,num);
                            }
                        });
                        this._storeSync(store);
                    }
                }
            },

            _saveRecord: function(record) {
                var aPromise = Ext.create('Deft.Deferred');
                record.save( {
                    success: function(result) {
                        aPromise.resolve(result);
                    },
                    failure: function(error) {
                        aPromise.reject(error);
                    }
                });
                return aPromise.promise;
            },

            _storeSync: function (store){
                var records = store.getModifiedRecords();
                if (records.length > 0) {
                    var promises = [];
                    var me = this;
                    _.each(store.getRecords(), function(record) {
                        promises.push (me._saveRecord(record));
                    });
                    Deft.Promise.all(promises).then({
                        success: function() { console.log("Completed " + promises.length + " saves." );},
                        failure: function() { console.log("Failed to save all records." );}
                    }).always( function() {
                        Ext.getCmp('headerBox').setLoading(false);       
                    });
                }
            },

            _saveWSJF: function(record) {
                var num = gApp._calcWSJF(record);
                var oldVal = record.get(gApp.wsjfField.field)? record.get(gApp.wsjfField.field).toFixed(2): 0.0;

                //if the field is 'decimal' you can only have two decimal places....or it doesn't save it!
                num = num.toFixed(2);

                if (num !== oldVal) {
                    record.set(gApp.wsjfField.field, num);
                    record.save({
                        callback: function() {
                            if (gApp.getSetting('useWSJFAutoSort')) {
                                Ext.getCmp('piGrid').refresh();
                            }
                        }
                    });
                }
            }

        });

//                Ext.util.Observable.capture( grid, function(event) { console.log(event, arguments);});

        this.add(grid);

    },

    _calcWSJF: function(record) {
        var num = 0.0;
        //Add up above the line
        var aboveTheLine = 0;
        var belowTheLine = 0;   //Prevent divide by zero later on.

        _.each(_.filter(gApp.wsjfCalcFields, function(field) {
            return field.aboveLine;
        }), function(field) {
            aboveTheLine += record.get(field.field);
        });

        //Add up below the line
        _.each(_.filter(gApp.wsjfCalcFields, function(field) {
            return !field.aboveLine;
        }), function(field) {
            belowTheLine += record.get(field.field);
        });

        //Do the calc
        num = aboveTheLine/ ( belowTheLine>0? belowTheLine: 1);
        return num;
    },

    _recordToRank: 0,
    _rankingRecord: null,
    _store: null,

    _storeRecords: function() {

        this._store = Ext.getCmp('piGrid').store;
        this._recordToRank = 0;
        this._rankingRecord = this._store.data.items[this._recordToRank];

        if (Ext.getCmp('globalCheck').value === true) {

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
            html += '<p><strong>' + record.Name + '(' + record.Value + '):  ' + record.Description + '</strong></p>';
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


        var doChooser = Ext.create('Rally.ui.dialog.Dialog', {
            id: 'localChooser',
            autoShow: true,
            draggable: true,
            width: 300,
            records: this.records,
            title: chooserTitle,
            items: localBox,
            buttons: [{
                text: 'OK',
                handler: function(arg1, arg2, arg3) {
                    _.each(this.records, function(record) {
                        record.set(chooserField, Ext.getCmp('localBox').value);
                        var num = gApp._calcWSJF(record).toFixed(2);

                        //if the field is 'decimal' you can only have two decimal places....
                        record.set(gApp.WSJFScore.field, num.toFixed(2));
                        record.save({
                            callback: function() {
                                if (Ext.getCmp('wsjfApp').getSetting('useWSJFAutoSort')) {
                                    Ext.getCmp('piGrid').refresh();
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


Ext.define('wsjfBulkSetRisk', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetRisk',

    config: {
        text: 'Risk Reduction',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose RR/OE potential', 'RROEValue');
        },
        data: [{
            'Name': 'None',
            'Value': 0,
            'Description': ''
        }, {
            'Name': 'Minimal',
            'Value': 1,
            'Description': ''
        }, {
            'Name': 'Low',
            'Value': 2,
            'Description': ''
        }, {
            'Name': 'Medium',
            'Value': 3,
            'Description': ''
        }, {
            'Name': 'High',
            'Value': 5,
            'Description': ''
        }, {
            'Name': 'Very High',
            'Value': 8,
            'Description': ''
        }, {
            'Name': 'Extreme',
            'Value': 13,
            'Description': ''
        }]
    }
});

Ext.define('wsjfBulkSetValue', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetValue',

    config: {
        text: 'Business Value',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose Derived Value', 'UserBusinessValue');
        },
        data: [{
            'Name': 'None',
            'Value': 0,
            'Description': ''
        }, {
            'Name': 'Minimal',
            'Value': 1,
            'Description': ''
        }, {
            'Name': 'Low',
            'Value': 2,
            'Description': ''
        }, {
            'Name': 'Medium',
            'Value': 3,
            'Description': ''
        }, {
            'Name': 'High',
            'Value': 5,
            'Description': ''
        }, {
            'Name': 'Very High',
            'Value': 8,
            'Description': ''
        }, {
            'Name': 'Extreme',
            'Value': 13,
            'Description': ''
        }]
    }
});

Ext.define('wsjfBulkSetTime', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetTime',

    config: {
        text: 'Time Criticality',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose Urgency Rating', 'TimeCriticality');
        },

        data: [{
            'Name': 'None',
            'Value': 0,
            'Description': 'No urgency'
        }, {
            'Name': 'Minimal',
            'Value': 1,
            'Description': 'This year'
        }, {
            'Name': 'Low',
            'Value': 2,
            'Description': 'Within 6 months'
        }, {
            'Name': 'Medium',
            'Value': 3,
            'Description': 'This quarter'
        }, {
            'Name': 'High',
            'Value': 5,
            'Description': 'This month'
        }, {
            'Name': 'Very High',
            'Value': 8,
            'Description': 'This week'
        }, {
            'Name': 'Extreme',
            'Value': 13,
            'Description': 'Immediately'
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

Ext.define('wsjfBulkSetPlan', {
    extend: Rally.ui.grid.localWSJFBulkSet,
    alias: 'widget.wsjfBulkSetPlan',

    config: {
        text: 'Size',
        handler: function(arg1, arg2, arg3) {
            this._onSetParam('Choose Size/Effort Rating', 'PlanEstimate');
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