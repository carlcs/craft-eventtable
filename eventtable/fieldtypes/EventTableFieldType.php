<?php
namespace Craft;

/**
 * Class EventTableFieldType
 */
class EventTableFieldType extends BaseFieldType
{
	// Public Methods
	// =========================================================================

	/**
	 * Returns the component's name.
	 *
	 * @return string
	 */
	public function getName()
	{
		return Craft::t('Event Table');
	}

	/**
	 * Returns the field's content attribute config.
	 *
	 * @return mixed
	 */
	public function defineContentAttribute()
	{
		return AttributeType::Mixed;
	}

	/**
	 * Returns the component's settings HTML.
	 *
	 * @return string|null
	 */
	public function getSettingsHtml()
	{
		$columns = $this->getSettings()->columns;
		$defaults = $this->getSettings()->defaults;

		if (!$columns)
		{
			$columns = array('col1' => array('heading' => '', 'handle' => '', 'type' => 'singleline'));

			// Update the actual settings model for getInputHtml()
			$this->getSettings()->columns = $columns;
		}

		if ($defaults === null)
		{
			$defaults = array('row1' => array());
		}

		$columnSettings = array(
			'heading' => array(
				'heading' => Craft::t('Column Heading'),
				'type' => 'singleline',
				'autopopulate' => 'handle'
			),
			'handle' => array(
				'heading' => Craft::t('Handle'),
				'class' => 'code',
				'type' => 'singleline'
			),
			'width' => array(
				'heading' => Craft::t('Width'),
				'class' => 'code',
				'type' => 'singleline',
				'width' => 50
			),
			'type' => array(
				'heading' => Craft::t('Type'),
				'class' => 'thin',
				'type' => 'select',
				'options' => array(
					'singleline' => Craft::t('Single-line Text'),
					'multiline' => Craft::t('Multi-line text'),
					'number' => Craft::t('Number'),
					'checkbox' => Craft::t('Checkbox'),
					'datetime' => Craft::t('Date/Time'),
				)
			),
		);

		craft()->templates->includeJsResource('js/TableFieldSettings.js');
		craft()->templates->includeJs('new Craft.TableFieldSettings(' .
			'"'.craft()->templates->namespaceInputName('columns').'", ' .
			'"'.craft()->templates->namespaceInputName('defaults').'", ' .
			JsonHelper::encode($columns).', ' .
			JsonHelper::encode($defaults).', ' .
			JsonHelper::encode($columnSettings) .
		');');

		$columnsField = craft()->templates->renderMacro('_includes/forms', 'editableTableField', array(
			array(
				'label'        => Craft::t('Table Columns'),
				'instructions' => Craft::t('Define the columns your table should have.'),
				'id'           => 'columns',
				'name'         => 'columns',
				'cols'         => $columnSettings,
				'rows'         => $columns,
				'addRowLabel'  => Craft::t('Add a column'),
				'initJs'       => false
			)
		));

		$defaultsField = craft()->templates->renderMacro('_includes/forms', 'editableTableField', array(
			array(
				'label'        => Craft::t('Default Values'),
				'instructions' => Craft::t('Define the default values for the field.'),
				'id'           => 'defaults',
				'name'         => 'defaults',
				'cols'         => $columns,
				'rows'         => $defaults,
				'initJs'       => false
			)
		));

		return $columnsField.$defaultsField;
	}

	/**
	 * Returns the field's input HTML.
	 *
	 * @param string $name
	 * @param mixed  $value
	 * @return string
	 */
	public function getInputHtml($name, $value)
	{
		$input = '<input type="hidden" name="'.$name.'" value="">';

		$tableHtml = $this->_getInputHtml($name, $value, false);

		if ($tableHtml)
		{
			$input .= $tableHtml;
		}

		return $input;
	}

	/**
	 * Returns the input value as it should be stored in the database.
	 *
	 * @param mixed $value
	 * @return mixed
	 */
	public function prepValueFromPost($value)
	{
		$this->_convertDateTimes($value);

		if (is_array($value))
		{
			// Drop the string row keys
			return array_values($value);
		}
	}

	/**
	 * Prepares the field's value for use.
	 *
	 * @param mixed $value
	 * @return mixed
	 */
	public function prepValue($value)
	{
		$this->_convertDateTimes($value);

		if (is_array($value) && ($columns = $this->getSettings()->columns))
		{
			// Make the values accessible from both the col IDs and the handles
			foreach ($value as &$row)
			{
				foreach ($columns as $colId => $col)
				{
					if ($col['handle'])
					{
						$row[$col['handle']] = (isset($row[$colId]) ? $row[$colId] : null);
					}
				}
			}

			return $value;
		}
	}

	/**
	 * Returns static HTML for the field's value.
	 *
	 * @param mixed $value
	 * @return string
	 */
	public function getStaticHtml($value)
	{
		return $this->_getInputHtml(StringHelper::randomString(), $value, true);
	}

	// Protected Methods
	// =========================================================================

	/**
	 * Defines the settings.
	 *
	 * @return array
	 */
	protected function defineSettings()
	{
		return array(
			'columns' => AttributeType::Mixed,
			'defaults' => AttributeType::Mixed,
		);
	}

	/**
	 * Preps the settings before they're saved to the database.
	 *
	 * @param array $settings
	 * @return array
	 */
	public function prepSettings($settings)
	{
		if (!isset($settings['defaults']))
		{
			$settings['defaults'] = array();
		}

		return $settings;
	}

	// Private Methods
	// =========================================================================

	/**
	 * Returns the field's input HTML.
	 *
	 * @param string $name
	 * @param mixed  $value
	 * @param bool  $static
	 * @return string
	 */
	private function _getInputHtml($name, $value, $static)
	{
		$columns = $this->getSettings()->columns;

		if ($columns)
		{
			// Translate the column headings
			foreach ($columns as &$column)
			{
				if (!empty($column['heading']))
				{
					$column['heading'] = Craft::t($column['heading']);
				}
			}

			if ($this->isFresh())
			{
				$defaults = $this->getSettings()->defaults;

				if (is_array($defaults))
				{
					$value = array_values($defaults);
				}
			}

			$id = craft()->templates->formatInputId($name);

			return craft()->templates->render('eventtable/forms/eventtable', array(
				'id'     => $id,
				'name'   => $name,
				'cols'   => $columns,
				'rows'   => $value,
				'static' => $static
			));
		}
	}

	/**
	* Loops through the data and converts the strings to DateTime objects.
	*
	* @param array &$value
	*/
	private function _convertDateTimes(&$value)
	{
		if (is_array($value) && ($columns = $this->getSettings()->columns))
		{
			foreach ($value as &$row)
			{
				foreach ($columns as $colId => $col)
				{
					if ($col['type'] == 'datetime')
					{
						if ((is_string($row[$colId]) && $row[$colId]) || (is_array($row[$colId]) && $row[$colId]['date']))
						{
							$row[$colId] = DateTime::createFromString($row[$colId]);
						}
						else
						{
							$row[$colId] = '';
						}
					}
				}
			}
		}
	}
}
