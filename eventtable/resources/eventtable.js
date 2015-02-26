/**
 * Editable event table class
 */
Craft.EditableEventTable = Garnish.Base.extend(
{
	id: null,
	baseName: null,
	columns: null,
	sorter: null,
	biggestId: -1,

	$table: null,
	$tbody: null,
	$addRowBtn: null,

	init: function(id, baseName, columns, settings)
	{
		this.id = id;
		this.baseName = baseName;
		this.columns = columns;
		this.setSettings(settings, Craft.EditableEventTable.defaults);

		this.$table = $('#'+id);
		this.$tbody = this.$table.children('tbody');

		this.sorter = new Craft.DataTableSorter(this.$table, {
			helperClass: 'datatablesorthelper',
			copyDraggeeInputValuesToHelper: true
		});

		var $rows = this.$tbody.children();

		for (var i = 0; i < $rows.length; i++)
		{
			new Craft.EditableEventTable.Row(this, $rows[i]);
		}

		this.$addRowBtn = this.$table.next('.add');
		this.addListener(this.$addRowBtn, 'activate', 'addRow');
	},

	addRow: function()
	{
		var rowId = this.settings.rowIdPrefix+(this.biggestId+1),
			rowHtml = Craft.EditableEventTable.getRowHtml(rowId, this.columns, this.baseName, {}),
			$tr = $(rowHtml).appendTo(this.$tbody);

		var $dateinput = $tr.find('div[class^="datewrapper"]').children('input');
		var $timeinput = $tr.find('div[class^="timewrapper"]').children('input');

		$dateinput.datepicker({
			constrainInput: false,
			dateFormat: this.settings.datepicker.dateFormat,
			prevText: this.settings.datepicker.prevText,
			nextText: this.settings.datepicker.nextText,
			firstDay: this.settings.datepicker.firstDay,
		});

		$timeinput.timepicker({
			timeFormat: this.settings.timepicker.timeFormat,
			closeOnWindowScroll: false,
			orientation: this.settings.timepicker.orientation,
			step: this.settings.timepicker.step,
			lang: this.settings.timepicker.lang,
		});

		new Craft.EditableEventTable.Row(this, $tr);
		this.sorter.addItems($tr);

		// Focus the first (textual) input in the row
		$tr.find('.textual input, .textual textarea').first().focus();

		// onAddRow callback
		this.settings.onAddRow($tr);
	}
},
{
	textualColTypes: ['singleline', 'multiline', 'number'],
	datetimeColTypes: ['datetime', 'date', 'time'],
	defaults: {
		rowIdPrefix: '',
		onAddRow: $.noop,
		onDeleteRow: $.noop
	},

	getRowHtml: function(rowId, columns, baseName, values)
	{
		var rowHtml = '<tr data-id="'+rowId+'">';

		for (var colId in columns)
		{
			var col = columns[colId],
				name = baseName+'['+rowId+']['+colId+']',
				id = baseName+'-'+rowId+'-'+colId,
				value = (typeof values[colId] != 'undefined' ? values[colId] : ''),
				textual = Craft.inArray(col.type, Craft.EditableEventTable.textualColTypes),
				datetime = Craft.inArray(col.type, Craft.EditableEventTable.datetimeColTypes);

			rowHtml += '<td class="'+(datetime ? 'datetime' : '')+' '+(textual ? 'textual' : '')+' '+(typeof col['class'] != 'undefined' ? col['class'] : '')+'"' +
			              (typeof col['width'] != 'undefined' ? ' width="'+col['width']+'"' : '') +
			              '>';

			switch (col.type)
			{
				case 'select':
				{
					rowHtml += '<div class="select small"><select name="'+name+'">';

					var hasOptgroups = false;

					for (var key in col.options)
					{
						var option = col.options[key];

						if (typeof option.optgroup != 'undefined')
						{
							if (hasOptgroups)
							{
								rowHtml += '</optgroup>';
							}
							else
							{
								hasOptgroups = true;
							}

							rowHtml += '<optgroup label="'+option.optgroup+'">';
						}
						else
						{
							var optionLabel = (typeof option.label != 'undefined' ? option.label : option),
								optionValue = (typeof option.value != 'undefined' ? option.value : key),
								optionDisabled = (typeof option.disabled != 'undefined' ? option.disabled : false);

							rowHtml += '<option value="'+optionValue+'"'+(optionValue == value ? ' selected' : '')+(optionDisabled ? ' disabled' : '')+'>'+optionLabel+'</option>';
						}
					}

					if (hasOptgroups)
					{
						rowHtml += '</optgroup>';
					}

					rowHtml += '</select></div>';

					break;
				}

				case 'checkbox':
				{
					rowHtml += '<input type="hidden" name="'+name+'">' +
					           '<input type="checkbox" name="'+name+'" value="1"'+(value ? ' checked' : '')+'>';

					break;
				}

				case 'datetime':
				case 'date':
				case 'time':
				{
					rowHtml += '<div class="datetimewrapper">';
					if (Craft.inArray(col.type, ['datetime', 'date']))
					{
						rowHtml += '<div class="datewrapper">' +
											 '<input class="text" type="text" id="'+id+'-date" size="10" name="'+name+'[date]" value="" autocomplete="off">' +
											 '</div> ';
					}
					if (Craft.inArray(col.type, ['datetime', 'time']))
					{
						rowHtml += '<div class="timewrapper">' +
								       '<input class="text" type="text" id="'+id+'-time" size="10" name="'+name+'[time]" value="" autocomplete="off">' +
											 '</div>';
					}
					rowHtml += '</div>';

					break;
				}

				case 'singleline':
				{
					rowHtml += '<input class="text nicetext fullwidth" type="text" name="'+name+'" value="'+value+'" autocomplete="off" placeholder="">'

					break;
				}

				default:
				{
					rowHtml += '<textarea class="text nicetext fullwidth" name="'+name+'" rows="1">'+value+'</textarea>';
				}
			}

			rowHtml += '</td>';
		}

		rowHtml += '<td class="thin action"><a class="move icon" title="'+Craft.t('Reorder')+'"></a></td>' +
				'<td class="thin action"><a class="delete icon" title="'+Craft.t('Delete')+'"></a></td>' +
			'</tr>';

		return rowHtml;
	}
});

/**
 * Editable table row class
 */
Craft.EditableEventTable.Row = Garnish.Base.extend(
{
	table: null,
	id: null,
	niceTexts: null,

	$tr: null,
	$tds: null,
	$textareas: null,
	$deleteBtn: null,

	init: function(table, tr)
	{
		this.table = table;
		this.$tr = $(tr);
		this.$tds = this.$tr.children();

		// Get the row ID, sans prefix
		var id = parseInt(this.$tr.attr('data-id').substr(this.table.settings.rowIdPrefix.length));

		if (id > this.table.biggestId)
		{
			this.table.biggestId = id;
		}

		this.$textareas = $();
		this.niceTexts = [];
		var textareasByColId = {};

		var i = 0;

		for (var colId in this.table.columns)
		{
			var col = this.table.columns[colId];

			if (Craft.inArray(col.type, Craft.EditableEventTable.textualColTypes))
			{
				$textarea = $('textarea', this.$tds[i]);
				this.$textareas = this.$textareas.add($textarea);

				this.addListener($textarea, 'focus', 'onTextareaFocus');
				this.addListener($textarea, 'mousedown', 'ignoreNextTextareaFocus');

				this.niceTexts.push(new Garnish.NiceText($textarea, {
					onHeightChange: $.proxy(this, 'onTextareaHeightChange')
				}));

				if (col.type == 'singleline' || col.type == 'number')
				{
					this.addListener($textarea, 'keypress', { type: col.type }, 'validateKeypress');
				}

				textareasByColId[colId] = $textarea;
			}

			i++;
		}

		// Adapt the background color from underlaying Matrix field, if there is one
		var $closestPane = this.$tr.closest('div[class^="pane"]');
		var $closestMatrix = this.$tr.closest('div[class^="matrixblock"]');
		var $backgroundColor = $closestMatrix.length ? $closestMatrix.css('background-color') : $closestPane.css('background-color');

		if (typeof($backgroundColor) != 'undefined')
		{
			this.$tr.css('background-color', $backgroundColor);
		}

		// Now that all of the text cells have been nice-ified, let's normalize the heights
		this.onTextareaHeightChange();

		// Now look for any autopopulate columns
		for (var colId in this.table.columns)
		{
			var col = this.table.columns[colId];

			if (col.autopopulate && typeof textareasByColId[col.autopopulate] != 'undefined' && !textareasByColId[colId].val())
			{
				if (col.autopopulate == 'handle')
				{
					new Craft.HandleGenerator(textareasByColId[colId], textareasByColId[col.autopopulate]);
				}
				else
				{
					new Craft.BaseInputGenerator(textareasByColId[colId], textareasByColId[col.autopopulate]);
				}
			}
		}

		var $deleteBtn = this.$tr.children().last().find('.delete');
		this.addListener($deleteBtn, 'click', 'deleteRow');
	},

	onTextareaFocus: function(ev)
	{
		this.onTextareaHeightChange();

		var $textarea = $(ev.currentTarget);

		if ($textarea.data('ignoreNextFocus'))
		{
			$textarea.data('ignoreNextFocus', false);
			return;
		}

		setTimeout(function()
		{
			var val = $textarea.val();

			// Does the browser support setSelectionRange()?
			if (typeof $textarea[0].setSelectionRange != 'undefined')
			{
				// Select the whole value
				var length = val.length * 2;
				$textarea[0].setSelectionRange(0, length);
			}
			else
			{
				// Refresh the value to get the cursor positioned at the end
				$textarea.val(val);
			}
		}, 0);
	},

	ignoreNextTextareaFocus: function(ev)
	{
		$.data(ev.currentTarget, 'ignoreNextFocus', true);
	},

	validateKeypress: function(ev)
	{
		var keyCode = ev.keyCode ? ev.keyCode : ev.charCode;

		if (!ev.metaKey && !ev.ctrlKey && (
			(keyCode == Garnish.RETURN_KEY) ||
			(ev.data.type == 'number' && !Craft.inArray(keyCode, Craft.EditableEventTable.Row.numericKeyCodes))
		))
		{
			ev.preventDefault();
		}
	},

	onTextareaHeightChange: function()
	{
		// Keep all the textareas' heights in sync
		var tallestTextareaHeight = -1;

		for (var i = 0; i < this.niceTexts.length; i++)
		{
			if (this.niceTexts[i].height > tallestTextareaHeight)
			{
				tallestTextareaHeight = this.niceTexts[i].height;
			}
		}

		this.$textareas.css('min-height', tallestTextareaHeight);

		// If the <td> is still taller, go with that insted
		var tdHeight = this.$textareas.first().parent().height();

		if (tdHeight > tallestTextareaHeight)
		{
			this.$textareas.css('min-height', tdHeight);
		}
	},

	deleteRow: function()
	{
		this.table.sorter.removeItems(this.$tr);
		this.$tr.remove();

		// onDeleteRow callback
		this.table.settings.onDeleteRow(this.$tr);
	}
},
{
	numericKeyCodes: [9 /* (tab) */ , 8 /* (delete) */ , 37,38,39,40 /* (arrows) */ , 45,91 /* (minus) */ , 46,190 /* period */ , 48,49,50,51,52,53,54,55,56,57 /* (0-9) */ ]
});
